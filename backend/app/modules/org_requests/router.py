"""Organization Request routes — email verification + admin review."""

import asyncio
import json
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user, require_admin, TokenPayload
from app.core.auth import hash_password
from app.config import settings
from app.modules.org_requests.models import OrganizationRequest, PENDING, APPROVED, REJECTED
from app.modules.communications.models import Notification
from app.modules.org_requests.schemas import (
    OrgRequestCreate,
    OrgRequestCreatedResponse,
    OrgRequestListResponse,
    OrgRequestReject,
    OrgRequestResponse,
    OrgRequestSetupPassword,
    OrgRequestSetupResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

BASE_URL = settings.APP_BASE_URL


# ── Email Retry Helper ────────────────────────────────────────

async def send_email_with_retry(to: str, subject: str, html_body: str, tenant_id: str, db: AsyncSession, max_retries: int = 3) -> bool:
    """Send email with retry and exponential backoff."""
    from app.core.email.service import send_email
    for attempt in range(max_retries):
        try:
            from app.core.database import async_session_factory
            async with async_session_factory() as email_db:
                await send_email(
                    to=to,
                    subject=subject,
                    html_body=html_body,
                    tenant_id=tenant_id,
                    db=email_db,
                )
                await email_db.commit()
            return True
        except Exception as e:
            delay = 2 ** attempt
            logger.warning(f"Email send attempt {attempt + 1}/{max_retries} failed to {to}: {e}. Retrying in {delay}s...")
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
    logger.error(f"All {max_retries} email send attempts failed for {to} (subject: {subject})")
    return False


# ── Email Verification Token ─────────────────────────────────

def create_verification_token(data: dict) -> str:
    """Create a JWT token for email verification (24h expiry)."""
    from jose import jwt
    payload = {
        **data,
        "purpose": "org_request_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_verification_token(token: str) -> dict | None:
    """Decode and validate a verification token. Returns None if invalid/expired."""
    from jose import jwt, JWTError, ExpiredSignatureError
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("purpose") != "org_request_verification":
            return None
        return payload
    except ExpiredSignatureError:
        logger.warning("Verification token expired")
        return None
    except JWTError as e:
        logger.warning(f"Invalid verification token: {e}")
        return None


# ── Public: Submit a request (sends verification email) ──────

@router.post("", response_model=OrgRequestCreatedResponse, status_code=status.HTTP_201_CREATED)
async def submit_org_request(
    data: OrgRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: submit a new organization registration request.

    Instead of immediately creating a pending request, we:
    1. Create the request with status='email_pending' and email_verified=False
    2. Send a verification email with a unique token link
    3. The request enters the admin pending queue only after email confirmation
    """
    # Check for duplicate pending or email_pending request by email
    existing = await db.execute(
        select(OrganizationRequest).where(
            OrganizationRequest.contact_email == data.contact_email.lower().strip(),
            OrganizationRequest.status.in_([PENDING, "email_pending"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="You already have a pending request. Please check your email or contact support.",
        )

    # Create request in email_pending state (not yet visible to admins)
    request = OrganizationRequest(
        org_name=data.org_name.strip(),
        contact_person=data.contact_person.strip(),
        contact_email=data.contact_email.lower().strip(),
        phone=data.phone.strip() if data.phone else None,
        description=data.description,
        website=data.website,
        linkedin_profile=data.linkedin_profile,
        expected_members=data.expected_members,
        status="email_pending",
        email_verified=False,
    )
    db.add(request)
    await db.flush()

    # Create verification token with all form data
    token = create_verification_token({
        "request_id": str(request.id),
        "email": request.contact_email,
        "org_name": request.org_name,
        "contact_person": request.contact_person,
    })

    # Send verification email
    verify_url = f"{BASE_URL}/verify-email?token={token}"
    org_name_escaped = request.org_name.replace("<", "&lt;").replace(">", "&gt;")
    contact_name_escaped = request.contact_person.replace("<", "&lt;").replace(">", "&gt;")

    try:
        await send_email_with_retry(
            to=request.contact_email,
            subject=f"Verify your email — {org_name_escaped} Registration",
            html_body=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0d9488, #065f46); line-height: 48px; color: white; font-size: 24px; font-weight: bold;">A</div>
                    </div>
                    <h2 style="color: #1e293b; text-align: center;">Verify Your Email Address</h2>
                    <p style="color: #475569; font-size: 15px;">Hi {contact_name_escaped},</p>
                    <p style="color: #475569; font-size: 15px;">
                        Thank you for registering <strong>{org_name_escaped}</strong> on AssocHub.
                        To continue with your registration, please verify your email address by clicking the button below:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{verify_url}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            ✉️ Verify My Email
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; text-align: center;">
                        This link expires in 24 hours.
                    </p>
                    <p style="color: #64748b; font-size: 14px;">
                        If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="color: #0d9488; font-size: 13px; word-break: break-all; background: #f0fdfa; padding: 8px 12px; border-radius: 6px;">{verify_url}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        If you didn't request this registration, you can safely ignore this email.
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        AssocHub — Open Source Association Management
                    </p>
                </div>
                """,
            tenant_id="platform",
            db=db,
        )
    except Exception as e:
        logger.error(f"Failed to send verification email to {request.contact_email}: {e}")

    return OrgRequestCreatedResponse(
        id=request.id,
        org_name=request.org_name,
        status="email_pending",
        message="Please check your email to verify your address. Your request will be submitted to our review team after verification.",
    )


# ── Public: Verify email via token ───────────────────────────

@router.get("/verify-email/{token}")
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: verify email and activate the org request.

    Decodes the verification token, marks the request as email_verified,
    changes status from 'email_pending' to 'pending', and notifies admins.
    """
    payload = decode_verification_token(token)
    if not payload:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification link. Please submit your registration again.",
        )

    request_id = payload.get("request_id")
    if not request_id:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    result = await db.execute(
        select(OrganizationRequest).where(OrganizationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Registration request not found")

    if req.email_verified:
        return {"message": "Email already verified", "org_name": req.org_name, "already_verified": True}

    if req.status != "email_pending":
        raise HTTPException(status_code=400, detail="This request has already been processed")

    # Verify and promote to pending
    req.email_verified = True
    req.status = PENDING
    await db.flush()

    # ── Notify platform admin ──
    try:
        await send_email_with_retry(
            to=settings.ADMIN_NOTIFICATION_EMAIL,
            subject=f"New Organization Request: {req.org_name} ✓ (email verified)",
            html_body=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0d9488;">New Organization Request</h2>
                    <p>A new association has requested to join AssocHub. <strong style="color: #059669;">✓ Email verified</strong></p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Association:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.org_name}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Contact:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.contact_person}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.contact_email}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Expected members:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.expected_members or 'Not specified'}</td></tr>
                        {f'<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Website:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.website}</td></tr>' if req.website else ''}
                        {f'<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">LinkedIn:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{req.linkedin_profile}</td></tr>' if req.linkedin_profile else ''}
                    </table>
                    {f'<p><strong>Description:</strong> {req.description}</p>' if req.description else ''}
                    <p style="margin-top: 20px;">
                        <a href="{BASE_URL}/admin/org-requests" style="display: inline-block; padding: 12px 24px; background-color: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Review Request
                        </a>
                    </p>
                </div>
                """,
            tenant_id="platform",
            db=db,
        )
    except Exception as e:
        logger.error(f"Failed to send admin notification for verified org request: {e}")

    # Create in-app notifications for super_admin users
    try:
        from app.modules.members.models import User
        admins_result = await db.execute(select(User).where(User.is_active == True))
        all_users = admins_result.scalars().all()
        for u in all_users:
            roles = u.roles or []
            if isinstance(roles, str):
                try:
                    roles = json.loads(roles)
                except (json.JSONDecodeError, TypeError):
                    roles = []
            if isinstance(roles, list) and "super_admin" in roles:
                notif = Notification(
                    tenant_id=u.tenant_id or "platform",
                    user_id=u.id,
                    title="New Organization Request (Email Verified)",
                    message=f"{req.org_name} ({req.contact_person}) has verified their email and submitted a request to join AssocHub.",
                    link="/admin/org-requests",
                    notification_type="system",
                )
                db.add(notif)
        await db.flush()
    except Exception as e:
        logger.error(f"Failed to create in-app notifications for verified org request: {e}")

    return {"message": "Email verified successfully", "org_name": req.org_name, "already_verified": False}


# ── Admin: List all requests ─────────────────────────────────

@router.get("", response_model=OrgRequestListResponse)
async def list_org_requests(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: list organization requests with optional status filter."""
    stmt = select(OrganizationRequest)
    count_stmt = select(sa_func.count()).select_from(OrganizationRequest)

    if status_filter:
        if status_filter not in (PENDING, APPROVED, REJECTED):
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")
        stmt = stmt.where(OrganizationRequest.status == status_filter)
        count_stmt = count_stmt.where(OrganizationRequest.status == status_filter)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(OrganizationRequest.created_at.desc())
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return OrgRequestListResponse(
        items=[OrgRequestResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Admin: Get single request ────────────────────────────────

@router.get("/{request_id}", response_model=OrgRequestResponse)
async def get_org_request(
    request_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: get details of a single org request."""
    result = await db.execute(
        select(OrganizationRequest).where(OrganizationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.refresh(req)
    return OrgRequestResponse.model_validate(req)


# ── Admin: Approve ───────────────────────────────────────────

@router.patch("/{request_id}/approve", response_model=OrgRequestResponse)
async def approve_org_request(
    request_id: str,
    request: Request,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: approve an org request."""
    result = await db.execute(
        select(OrganizationRequest).where(OrganizationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != PENDING:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    # Generate tenant_id from org name
    slug = re.sub(r'[^a-z0-9]+', '-', req.org_name.lower().strip()).strip('-')
    slug = slug[:64]

    from app.modules.organizations.models import Organization
    existing_org = await db.execute(
        select(Organization).where(Organization.slug == slug)
    )
    if existing_org.scalar_one_or_none():
        slug = f"{slug}-{secrets.token_hex(3)}"

    tenant_id = slug

    # Create Organization
    org = Organization(
        slug=slug,
        name=req.org_name,
        description=req.description,
        website=req.website,
        contact_email=req.contact_email,
        is_active=True,
        tenant_id=tenant_id,
    )
    db.add(org)
    await db.flush()

    # Generate magic setup token
    setup_token = secrets.token_urlsafe(48)

    # Update request
    req.status = APPROVED
    req.tenant_id = tenant_id
    req.reviewed_by = user.sub
    req.reviewed_at = datetime.now(timezone.utc)
    req.setup_token = setup_token
    await db.flush()

    # Send setup email
    setup_url = f"{BASE_URL}/setup-org-admin?token={setup_token}"
    contact_name_escaped = req.contact_person.replace("<", "&lt;").replace(">", "&gt;")
    org_name_escaped = req.org_name.replace("<", "&lt;").replace(">", "&gt;")

    try:
        await send_email_with_retry(
            to=req.contact_email,
            subject=f"Your AssocHub organization is ready — Set up your admin account",
            html_body=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0d9488;">Welcome to AssocHub, {contact_name_escaped}! 🎉</h2>
                    <p>Great news — your association <strong>{org_name_escaped}</strong> has been approved on AssocHub.</p>
                    <p>Click the button below to set up your admin account and start managing your association:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{setup_url}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            🔑 Set Up My Admin Account
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #64748b; font-size: 13px; word-break: break-all;">{setup_url}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 12px;">AssocHub — Open Source Association Management</p>
                </div>
                """,
            tenant_id=tenant_id,
            db=db,
        )
        logger.info(f"Setup email sent to {req.contact_email} for org {req.org_name}")
    except Exception as e:
        logger.error(f"Failed to send setup email to {req.contact_email}: {e}")

    await db.refresh(req)
    return OrgRequestResponse.model_validate(req)


# ── Admin: Reject ────────────────────────────────────────────

@router.patch("/{request_id}/reject", response_model=OrgRequestResponse)
async def reject_org_request(
    request_id: str,
    data: OrgRequestReject,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: reject an org request with a reason."""
    result = await db.execute(
        select(OrganizationRequest).where(OrganizationRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.status != PENDING:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    req.status = REJECTED
    req.rejection_reason = data.reason
    req.reviewed_by = user.sub
    req.reviewed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(req)

    # Send rejection email
    try:
        contact_name_escaped = req.contact_person.replace("<", "&lt;").replace(">", "&gt;")
        org_name_escaped = req.org_name.replace("<", "&lt;").replace(">", "&gt;")
        reason_block = f"<p><strong>Reason:</strong> {data.reason}</p>" if data.reason else ""
        await send_email_with_retry(
            to=req.contact_email,
            subject=f"Your AssocHub Organization Request Update",
            html_body=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #64748b;">Request Update</h2>
                    <p>Hi {contact_name_escaped},</p>
                    <p>We've reviewed the request for <strong>{org_name_escaped}</strong> to join AssocHub.</p>
                    <p>Unfortunately, we are unable to approve this request at this time.</p>
                    {reason_block}
                    <p>If you have questions or believe this was an error, please reply to this email.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 12px;">AssocHub — Open Source Association Management</p>
                </div>
                """,
            tenant_id="platform",
            db=db,
        )
        logger.info(f"Rejection email sent to {req.contact_email} for org {req.org_name}")
    except Exception as e:
        logger.error(f"Failed to send rejection email to {req.contact_email}: {e}")

    # In-app notifications
    try:
        from app.modules.members.models import User as UserModel
        admins_result = await db.execute(select(UserModel).where(UserModel.is_active == True))
        all_users = admins_result.scalars().all()
        for u in all_users:
            roles = u.roles or []
            if isinstance(roles, str):
                try:
                    roles = json.loads(roles)
                except (json.JSONDecodeError, TypeError):
                    roles = []
            if isinstance(roles, list) and "super_admin" in roles:
                notif = Notification(
                    tenant_id=u.tenant_id or "platform",
                    user_id=u.id,
                    title="Organization Request Rejected",
                    message=f"{req.org_name} ({req.contact_person}) request has been rejected.",
                    link="/admin/org-requests",
                    notification_type="system",
                )
                db.add(notif)
        await db.flush()
    except Exception as e:
        logger.error(f"Failed to create in-app notifications for rejection: {e}")

    return OrgRequestResponse.model_validate(req)


# ── Public: Set up admin account via magic link ──────────────

@router.get("/setup/{token}")
async def get_setup_info(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: validate a setup token and return org info for the setup page."""
    result = await db.execute(
        select(OrganizationRequest).where(
            OrganizationRequest.setup_token == token,
            OrganizationRequest.status == APPROVED,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Invalid or expired setup link")
    if req.setup_token_used:
        raise HTTPException(status_code=410, detail="This setup link has already been used")

    return {
        "org_name": req.org_name,
        "contact_person": req.contact_person,
        "contact_email": req.contact_email,
    }


@router.post("/setup/{token}", response_model=OrgRequestSetupResponse)
async def setup_admin_account(
    token: str,
    data: OrgRequestSetupPassword,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: complete admin account setup via magic link."""
    result = await db.execute(
        select(OrganizationRequest).where(
            OrganizationRequest.setup_token == token,
            OrganizationRequest.status == APPROVED,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Invalid or expired setup link")
    if req.setup_token_used:
        raise HTTPException(status_code=410, detail="This setup link has already been used")
    if not req.tenant_id:
        raise HTTPException(status_code=500, detail="Tenant not yet created. Please contact support.")

    from app.modules.members.models import User, MemberProfile, MemberStatus

    existing_user = await db.execute(
        select(User).where(
            User.email == req.contact_email,
            User.tenant_id == req.tenant_id,
        )
    )
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    names = req.contact_person.strip().split(None, 1)
    first_name = names[0] if names else req.contact_person
    last_name = names[1] if len(names) > 1 else ""

    user = User(
        email=req.contact_email.lower().strip(),
        hashed_password=hash_password(data.password),
        first_name=first_name,
        last_name=last_name,
        tenant_id=req.tenant_id,
        roles=["tenant_admin"],
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    await db.flush()

    import uuid
    from datetime import timedelta
    member_number = f"MEM-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    profile = MemberProfile(
        user_id=user.id,
        tenant_id=req.tenant_id,
        status=MemberStatus.ACTIVE,
        joined_at=now,
        expires_at=now + timedelta(days=365),
        member_number=member_number,
    )
    db.add(profile)
    await db.flush()

    req.setup_token_used = True
    await db.flush()

    logger.info(f"Admin account created for {req.contact_email} (tenant: {req.tenant_id})")

    return OrgRequestSetupResponse(
        message="Your admin account has been created successfully!",
        login_url=f"{BASE_URL}/login",
    )
