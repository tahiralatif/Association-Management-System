"""Auth routes — login, register, refresh, me, password management."""

import uuid
import logging
import secrets
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
BASE_URL = "https://ams.14.jugaar.ai"


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


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    tenant_id: str


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    roles: list[str]
    tenant_id: str
    email_verified: bool = True


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

    # Generate verification token
    verification_token = secrets.token_urlsafe(48)

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        first_name=req.first_name,
        last_name=req.last_name,
        tenant_id=req.tenant_id,
        roles=["member"],
        is_active=True,
        email_verified=False,
        verification_token=verification_token,
        verification_sent_at=datetime.now(timezone.utc),
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

    verify_url = f"{BASE_URL}/verify-email?token={verification_token}"
    first_name_escaped = req.first_name.replace("<", "&lt;").replace(">", "&gt;")

    # Send welcome email + verification link
    async def _send_verification():
        try:
            from app.core.email.service import send_email
            from app.core.database import async_session_factory
            async with async_session_factory() as email_db:
                await send_email(
                    to=req.email,
                    subject="Verify your AssocHub email address",
                    html_body=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #0891b2;">Welcome to AssocHub, {first_name_escaped}!</h2>
                        <p>Thank you for creating an account. Please verify your email address to get started.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verify_url}" style="display: inline-block; padding: 14px 32px; background-color: #0891b2; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                ✉️ Verify My Email
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #64748b; font-size: 13px; word-break: break-all;">{verify_url}</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 12px;">AssocHub — Open Source Association Management</p>
                    </div>
                    """,
                    tenant_id=req.tenant_id,
                    db=email_db,
                    max_retries=2,
                )
                await email_db.commit()
                logging.getLogger(__name__).info(f"Verification email sent to {req.email}")
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to send verification email to {req.email}: {e}")

    background_tasks.add_task(_send_verification)

    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Verify email address using the token from the verification email."""
    from app.modules.members.models import User

    result = await db.execute(
        select(User).where(User.verification_token == req.token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    if user.email_verified:
        return {"message": "Email already verified. You can now log in."}

    # Check token age (7 days expiry)
    if user.verification_sent_at:
        age = datetime.now(timezone.utc) - user.verification_sent_at
        if age > timedelta(days=7):
            raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")

    user.email_verified = True
    user.verification_token = None
    user.verification_sent_at = None
    await db.flush()

    return {"message": "Email verified successfully. You can now log in."}


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(req: ResendVerificationRequest, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Resend verification email."""
    from app.modules.members.models import User

    result = await db.execute(
        select(User).where(User.email == req.email, User.tenant_id == req.tenant_id)
    )
    user = result.scalar_one_or_none()

    if not user or user.email_verified:
        # Always return success to prevent email enumeration
        return {"message": "If an account with that email exists and needs verification, a new link has been sent."}

    # Generate new token
    verification_token = secrets.token_urlsafe(48)
    user.verification_token = verification_token
    user.verification_sent_at = datetime.now(timezone.utc)
    await db.flush()

    verify_url = f"{BASE_URL}/verify-email?token={verification_token}"
    first_name_escaped = user.first_name.replace("<", "&lt;").replace(">", "&gt;")

    async def _send():
        try:
            from app.core.email.service import send_email
            from app.core.database import async_session_factory
            async with async_session_factory() as email_db:
                await send_email(
                    to=req.email,
                    subject="Verify your AssocHub email address",
                    html_body=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #0891b2;">Verify Your Email</h2>
                        <p>Hi {first_name_escaped}, here's a new verification link for your AssocHub account.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verify_url}" style="display: inline-block; padding: 14px 32px; background-color: #0891b2; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                ✉️ Verify My Email
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #64748b; font-size: 13px; word-break: break-all;">{verify_url}</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 12px;">AssocHub — Open Source Association Management</p>
                    </div>
                    """,
                    tenant_id=req.tenant_id,
                    db=email_db,
                    max_retries=2,
                )
                await email_db.commit()
                logging.getLogger(__name__).info(f"Verification email resent to {req.email}")
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to resend verification email to {req.email}: {e}")

    background_tasks.add_task(_send)

    return {"message": "If an account with that email exists and needs verification, a new link has been sent."}


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
        if user:
            await log_auth_event(db, req.tenant_id, user.id, "login_failed", {"reason": "bad_password"})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before logging in. Check your inbox for the verification link, or click 'Resend verification email' on the login page."
        )

    access = create_access_token(user.id, user.tenant_id, user.roles)
    refresh = create_refresh_token(user.id, user.tenant_id)

    ip = request.client.host if request.client else None
    await log_auth_event(db, req.tenant_id, user.id, "login", {}, ip)

    # Send login notification
    async def _send_login_notification():
        try:
            from app.core.email.service import send_email
            from app.core.database import async_session_factory
            now_str = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
            first_name_escaped = user.first_name.replace("<", "&lt;").replace(">", "&gt;")
            async with async_session_factory() as email_db:
                await send_email(
                    to=req.email,
                    subject="New login to your AssocHub account",
                    html_body=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #0891b2;">New Login Detected</h2>
                        <p>Hello {first_name_escaped},</p>
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
        email_verified=db_user.email_verified,
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset. Always returns success to prevent email enumeration."""
    from app.modules.members.models import User

    result = await db.execute(
        select(User).where(User.email == req.email, User.tenant_id == req.tenant_id)
    )
    user = result.scalar_one_or_none()

    if user:
        reset_token = create_access_token(
            user.id, user.tenant_id, user.roles,
            expires_delta=timedelta(hours=1),
        )
        await db.execute(
            text("""
                INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, details, created_at)
                VALUES (:id, :tenant_id, :user_id, 'password_reset_request', 'auth', :user_id, :details, :now)
            """),
            {
                "id": str(uuid.uuid4()),
                "tenant_id": req.tenant_id,
                "user_id": user.id,
                "details": {"email": req.email},
                "now": datetime.now(timezone.utc),
            },
        )
        await db.flush()

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
