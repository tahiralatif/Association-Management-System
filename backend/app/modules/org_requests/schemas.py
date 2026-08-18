"""Organization Request schemas."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ── Public submission ────────────────────────────────────────

class OrgRequestCreate(BaseModel):
    """Schema for the public 'Register Your Association' form."""
    org_name: str = Field(min_length=2, max_length=256)
    contact_person: str = Field(min_length=2, max_length=256)
    contact_email: EmailStr
    phone: str | None = Field(None, max_length=64)
    description: str | None = None
    website: str | None = None
    expected_members: str | None = None


class OrgRequestCreatedResponse(BaseModel):
    """Response after submitting an org request."""
    id: str
    org_name: str
    status: str
    message: str = "Your request has been submitted. We will review it and get back to you."


# ── Admin views ──────────────────────────────────────────────

class OrgRequestResponse(BaseModel):
    """Full detail of an org request (admin view)."""
    id: str
    org_name: str
    contact_person: str
    contact_email: str
    phone: str | None = None
    description: str | None = None
    website: str | None = None
    expected_members: str | None = None
    status: str
    rejection_reason: str | None = None
    tenant_id: str | None = None
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    setup_token_used: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrgRequestListResponse(BaseModel):
    """Paginated list of org requests."""
    items: list[OrgRequestResponse]
    total: int
    page: int
    per_page: int


class OrgRequestReject(BaseModel):
    """Rejection reason payload."""
    reason: str = Field(min_length=1, max_length=1000)


class OrgRequestSetupPassword(BaseModel):
    """Password set via magic link."""
    password: str = Field(min_length=8, max_length=128)


class OrgRequestSetupResponse(BaseModel):
    """Response after setting up admin account."""
    message: str
    login_url: str
