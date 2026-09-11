"""2FA/TOTP authentication endpoints — enable, verify, disable."""

from __future__ import annotations

import io
import logging
from datetime import datetime, timezone

import pyotp
import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import decode_token, get_current_user, TokenPayload
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────

class TwoFAEnableResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_url: str  # URL to fetch QR code image


class TwoFAVerifyRequest(BaseModel):
    code: str  # 6-digit TOTP code


class TwoFAStatusResponse(BaseModel):
    enabled: bool
    enabled_at: datetime | None = None


class TwoFADisableRequest(BaseModel):
    code: str  # Must provide current code to disable


# ── Endpoints ────────────────────────────────────────────────

@router.get("/2fa/status", response_model=TwoFAStatusResponse)
async def get_2fa_status(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if 2FA is enabled for the current user."""
    from app.modules.members.models import User

    result = await db.execute(select(User).where(User.id == user.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return TwoFAStatusResponse(
        enabled=bool(db_user.totp_secret),
        enabled_at=db_user.totp_enabled_at,
    )


@router.post("/2fa/enable", response_model=TwoFAEnableResponse)
async def enable_2fa(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new TOTP secret and return QR code URL.
    The secret is NOT saved yet — user must verify first via /2fa/verify.
    """
    from app.modules.members.models import User

    result = await db.execute(select(User).where(User.id == user.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.totp_secret:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled. Disable it first.",
        )

    # Generate secret
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret, issuer=settings.TOTP_ISSUER)
    email = db_user.email or "user"
    otpauth_url = totp.provisioning_uri(name=email, issuer_name=settings.TOTP_ISSUER)

    # Store secret temporarily (not enabled yet — needs verification)
    db_user.totp_secret_pending = secret
    await db.flush()

    qr_code_url = f"/api/v1/auth/2fa/qr?secret={secret}&email={email}"

    return TwoFAEnableResponse(
        secret=secret,
        otpauth_url=otpauth_url,
        qr_code_url=qr_code_url,
    )


@router.get("/2fa/qr")
async def get_qr_code(
    secret: str,
    email: str,
):
    """Generate QR code SVG for 2FA setup."""
    totp = pyotp.TOTP(secret, issuer=settings.TOTP_ISSUER)
    otpauth_url = totp.provisioning_uri(name=email, issuer_name=settings.TOTP_ISSUER)

    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(otpauth_url, image_factory=factory)

    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/svg+xml")


@router.post("/2fa/verify")
async def verify_2fa_enable(
    req: TwoFAVerifyRequest,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify TOTP code and enable 2FA. Must be called after /2fa/enable."""
    from app.modules.members.models import User

    result = await db.execute(select(User).where(User.id == user.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    secret = db_user.totp_secret_pending or db_user.totp_secret
    if not secret:
        raise HTTPException(
            status_code=400,
            detail="No 2FA setup in progress. Call /2fa/enable first.",
        )

    totp = pyotp.TOTP(secret)
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code. Try again.",
        )

    # Enable 2FA
    db_user.totp_secret = secret
    db_user.totp_secret_pending = None
    db_user.totp_enabled_at = datetime.now(timezone.utc)
    await db.flush()

    log.info("2FA enabled for user %s", user.sub)
    return {"message": "2FA enabled successfully", "enabled": True}


@router.post("/2fa/disable")
async def disable_2fa(
    req: TwoFADisableRequest,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable 2FA. Requires current TOTP code for confirmation."""
    from app.modules.members.models import User

    result = await db.execute(select(User).where(User.id == user.sub))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not db_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    totp = pyotp.TOTP(db_user.totp_secret)
    if not totp.verify(req.code, valid_window=1):
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code.",
        )

    db_user.totp_secret = None
    db_user.totp_secret_pending = None
    db_user.totp_enabled_at = None
    await db.flush()

    log.info("2FA disabled for user %s", user.sub)
    return {"message": "2FA disabled successfully", "enabled": False}
