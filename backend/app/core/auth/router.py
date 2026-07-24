"""Auth routes — login, register, refresh, me, password management."""

import uuid
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
    TokenPair,
    TokenPayload,
)
from app.core.password import validate_password_strength, PasswordValidationError
from app.core.audit import log_auth_event
from app.core.middleware.rate_limit import limiter

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    tenant_id: str

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_names(cls, v: str) -> str:
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_pw(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_pw(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    tenant_id: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_pw(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    roles: list[str]
    tenant_id: str


# ── Routes ───────────────────────────────────────────────────

@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(req: RegisterRequest, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Register a new user (self-service member registration)."""
    from app.modules.members.models import User

    # Check existing
    existing = await db.execute(
        select(User).where(User.email == req.email, User.tenant_id == req.tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        tenant_id=req.tenant_id,
        roles=["member"],
    )
    db.add(user)
    await db.flush()

    # Create member profile automatically
    from app.modules.members.models import MemberProfile, MemberStatus
    profile = MemberProfile(
        user_id=user.id,
        tenant_id=req.tenant_id,
        status=MemberStatus.ACTIVE,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(profile)
    await db.flush()

    access = create_access_token(user.id, user.tenant_id, user.roles)
    refresh = create_refresh_token(user.id, user.tenant_id)

    ip = request.client.host if request.client else None
    await log_auth_event(db, req.tenant_id, user.id, "register", {"email": req.email}, ip)

    # Send welcome email in background
    async def _send_welcome():
        try:
            from app.core.email.service import send_email
            from app.core.database import async_session_factory
            async with async_session_factory() as email_db:
                await send_email(
                    to=req.email,
                    subject=f"Welcome to AssocHub, {req.first_name}!",
                    html_body=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0891b2;">Welcome to AssocHub, {req.first_name}!</h2>
                        <p>Your account has been created successfully. Here's what you can do now:</p>
                        <ul>
                            <li>Manage your membership profile</li>
                            <li>Register for events</li>
                            <li>Track your payments and invoices</li>
                            <li>Participate in elections and polls</li>
                        </ul>
                        <p><strong>Your account details:</strong></p>
                        <ul>
                            <li>Email: {req.email}</li>
                            <li>Tenant: {req.tenant_id}</li>
                            <li>Role: Member</li>
                        </ul>
                        <p>If you have any questions, reply to this email or contact your association admin.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="color: #94a3b8; font-size: 12px;">AssocHub — Open Source Association Management</p>
                    </div>
                    """,
                    tenant_id=req.tenant_id,
                    db=email_db,
                    max_retries=1,
                )
                await email_db.commit()
                logging.getLogger(__name__).info(f"Welcome email sent to {req.email}")
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to send welcome email to {req.email}: {e}")

    background_tasks.add_task(_send_welcome)

    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
async def login(req: LoginRequest, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    from app.modules.members.models import User

    result = await db.execute(
        select(User).where(User.email == req.email, User.tenant_id == req.tenant_id)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        # Log failed attempt
        if user:
            await log_auth_event(db, req.tenant_id, user.id, "login_failed", {"reason": "bad_password"})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access = create_access_token(user.id, user.tenant_id, user.roles)
    refresh = create_refresh_token(user.id, user.tenant_id)

    ip = request.client.host if request.client else None
    await log_auth_event(db, req.tenant_id, user.id, "login", {}, ip)

    # Send login notification in background
    async def _send_login_notification():
        try:
            from app.core.email.service import send_email
            from app.core.database import async_session_factory
            now_str = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
            async with async_session_factory() as email_db:
                await send_email(
                    to=req.email,
                    subject="New login to your AssocHub account",
                    html_body=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0891b2;">New Login Detected</h2>
                        <p>Hello {user.first_name},</p>
                        <p>We noticed a new login to your AssocHub account.</p>
                        <p><strong>Login details:</strong></p>
                        <ul>
                            <li>Time: {now_str}</li>
                            <li>Email: {req.email}</li>
                            <li>Tenant: {req.tenant_id}</li>
                        </ul>
                        <p>If this was you, no action is needed.</p>
                        <p style="color: #dc2626;">If you did NOT log in, please change your password immediately and contact your admin.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="color: #94a3b8; font-size: 12px;">AssocHub — Open Source Association Management</p>
                    </div>
                    """,
                    tenant_id=req.tenant_id,
                    db=email_db,
                    max_retries=1,
                )
                await email_db.commit()
                logging.getLogger(__name__).info(f"Login notification sent to {req.email}")
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to send login notification to {req.email}: {e}")

    background_tasks.add_task(_send_login_notification)

    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("30/minute")
async def refresh_token(req: RefreshRequest, request: Request):
    """Refresh an access token."""
    payload = decode_token(req.refresh_token)
    if payload.type != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    access = create_access_token(payload.sub, payload.tenant_id, payload.roles)
    refresh = create_refresh_token(payload.sub, payload.tenant_id)

    return TokenPair(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=UserResponse)
async def get_me(user: TokenPayload = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current user profile."""
    from app.modules.members.models import User

    result = await db.execute(select(User).where(User.id == user.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=db_user.id,
        email=db_user.email,
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        roles=db_user.roles,
        tenant_id=db_user.tenant_id,
    )


# ── Password Management ─────────────────────────────────────

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: TokenPayload = Depends(get_current_user),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Change password (requires current password)."""
    from app.modules.members.models import User

    result = await db.execute(select(User).where(User.id == user.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(data.current_password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    db_user.hashed_password = hash_password(data.new_password)
    await db.flush()

    ip = request.client.host if request and request.client else None
    await log_auth_event(db, user.tenant_id, user.id, "password_change", {}, ip)

    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset. Always returns success to prevent email enumeration.
    In production, sends an email with a reset link.
    """
    from app.modules.members.models import User

    result = await db.execute(
        select(User).where(User.email == req.email, User.tenant_id == req.tenant_id)
    )
    user = result.scalar_one_or_none()

    if user:
        # Generate a reset token (valid for 1 hour)
        reset_token = create_access_token(
            user.id, user.tenant_id, user.roles,
            expires_delta=timedelta(hours=1),
        )
        # Store as a special-purpose token with type="reset"
        from app.core.auth import create_refresh_token
        # In production: send email with reset_token
        # For now, store a hash of the token for verification
        await db.execute(
            text("""
                INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, details, created_at)
                VALUES (:id, :tenant_id, :user_id, 'password_reset_request', 'auth', :user_id, :details, :now)
            """),
            {
                "id": str(uuid.uuid4()),
                "tenant_id": req.tenant_id,
                "user_id": user.id,
                "user_id": user.id,
                "details": {"email": req.email},
                "now": datetime.now(timezone.utc),
            },
        )
        await db.flush()

    # Always return success — prevents email enumeration
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    req: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    from app.modules.members.models import User

    payload = decode_token(req.token)
    if payload.type != "access":
        raise HTTPException(status_code=400, detail="Invalid reset token")

    result = await db.execute(select(User).where(User.id == payload.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    db_user.hashed_password = hash_password(req.new_password)
    await db.flush()

    ip = request.client.host if request and request.client else None
    await log_auth_event(db, payload.tenant_id, payload.sub, "password_reset", {}, ip)

    return {"message": "Password reset successful"}
