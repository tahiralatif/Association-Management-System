"""Member schemas — complete Pydantic models."""

from datetime import datetime
import re
from typing import Annotated
from pydantic import BaseModel, EmailStr, Field, model_validator

# Phone regex (international format)
PhoneNumber = Annotated[str, Field(
    pattern=r"^\+?[\d\s\-()]{7,20}$",
    description="Phone number in international format",
    examples=["+1-555-123-4567"],
)]


# ── User Schemas ─────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    roles: list[str] = ["member"]
    phone: str | None = None
    organization: str | None = Field(None, max_length=200)
    job_title: str | None = Field(None, max_length=100)

    @model_validator(mode="after")
    def validate_phone(self) -> "UserCreate":
        """Clean and validate phone — ignore non-phone garbage (browser autofill)."""
        if self.phone is not None:
            import re
            self.phone = self.phone.strip()
            # If it doesn't contain enough digits, it's not a phone number — clear it
            digits = re.sub(r"[^\d]", "", self.phone)
            if len(digits) < 7:
                self.phone = None
            # If it contains no plus and no digits, it's garbage — clear it
            elif not re.search(r"\d", self.phone):
                self.phone = None
            # Validate format if still present
            elif not re.match(r"^\+?[\d\s\-()]{7,20}$", self.phone):
                self.phone = None
        return self


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: str
    tenant_id: str
    roles: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Profile Schemas ──────────────────────────────────────────

class MemberProfileBase(BaseModel):
    phone: str | None = None
    organization: str | None = None
    job_title: str | None = None
    bio: str | None = None
    address: dict | None = None
    social_links: dict | None = None
    interests: list[str] | None = None
    email_opt_in: bool = True
    sms_opt_in: bool = False
    auto_renew: bool = False
    custom_fields: dict | None = None


class MemberProfileCreate(MemberProfileBase):
    user_id: str
    tier: str = Field(default="basic", pattern="^(free|basic|premium|corporate|lifetime)$")

    @model_validator(mode="after")
    def validate_tier(self) -> "MemberProfileCreate":
        valid_tiers = {"free", "basic", "premium", "corporate", "lifetime"}
        if self.tier not in valid_tiers:
            raise ValueError(f"Invalid tier '{self.tier}'. Must be one of: {', '.join(sorted(valid_tiers))}")
        return self


class MemberProfileUpdate(BaseModel):
    phone: PhoneNumber | None = None
    organization: str | None = Field(None, max_length=200)
    job_title: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=2000)
    avatar_url: str | None = Field(None, max_length=500)
    address: dict | None = None
    social_links: dict | None = None
    tier: str | None = Field(None, pattern="^(free|basic|premium|corporate|lifetime)$")
    interests: list[str] | None = None
    email_opt_in: bool | None = None
    sms_opt_in: bool | None = None
    auto_renew: bool | None = None
    custom_fields: dict | None = None

    @model_validator(mode="after")
    def validate_tier(self) -> "MemberProfileUpdate":
        if self.tier is not None:
            valid_tiers = {"free", "basic", "premium", "corporate", "lifetime"}
            if self.tier not in valid_tiers:
                raise ValueError(f"Invalid tier '{self.tier}'. Must be one of: {', '.join(sorted(valid_tiers))}")
        return self


class MemberProfileResponse(MemberProfileBase):
    id: str
    user_id: str
    member_number: str | None = None
    tier: str
    status: str
    joined_at: datetime
    expires_at: datetime | None = None
    renewal_date: datetime | None = None
    avatar_url: str | None = None
    tags: list[str] = []
    engagement_score: float = 0.0
    churn_risk: float = 0.0
    lifetime_value: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserWithProfile(UserResponse):
    member_profile: MemberProfileResponse | None = None


# ── Self-Service Schemas ─────────────────────────────────────

class SelfServiceProfileUpdate(BaseModel):
    """Members can only update their own profile fields."""
    phone: str | None = None
    organization: str | None = None
    job_title: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    address: dict | None = None
    social_links: dict | None = None
    interests: list[str] | None = None
    email_opt_in: bool | None = None
    sms_opt_in: bool | None = None
    auto_renew: bool | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MembershipStatusResponse(BaseModel):
    model_config = {"from_attributes": True}

    member_number: str | None = None
    tier: str
    status: str
    joined_at: datetime
    expires_at: datetime | None = None
    renewal_date: datetime | None = None
    auto_renew: bool
    engagement_score: float
    groups: list[str] = []


# ── Group Schemas ────────────────────────────────────────────

class GroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    group_type: str = "committee"
    parent_id: str | None = None
    max_members: int | None = None
    meeting_schedule: str | None = None
    contact_email: str | None = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    group_type: str | None = None
    parent_id: str | None = None
    max_members: int | None = None
    meeting_schedule: str | None = None
    contact_email: str | None = None
    is_active: bool | None = None


class GroupResponse(GroupBase):
    id: str
    tenant_id: str
    is_active: bool
    member_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupWithMembers(GroupResponse):
    members: list["GroupMemberResponse"] = []


class GroupMemberAdd(BaseModel):
    member_id: str
    role: str = "member"


class GroupMemberResponse(BaseModel):
    model_config = {"from_attributes": True}

    member_id: str
    user_name: str
    email: str
    role: str
    joined_at: datetime
    is_active: bool


class GroupMemberUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


# ── Import/Export Schemas ────────────────────────────────────

class ImportResult(BaseModel):
    model_config = {"from_attributes": True}

    total_rows: int
    successful: int
    failed: int
    errors: list[dict] = []  # [{row: 3, error: "Invalid email"}]
    created_ids: list[str] = []


class ExportParams(BaseModel):
    format: str = "csv"  # csv, xlsx, json
    tier: str | None = None
    status: str | None = None
    group_id: str | None = None
    tags: list[str] | None = None
    fields: list[str] | None = None  # specific fields to export


class BulkTagRequest(BaseModel):
    member_ids: list[str]
    tag_ids: list[str]


class SingleStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|active|suspended|lapsed|cancelled)$")

    @model_validator(mode="after")
    def validate_status(self) -> "SingleStatusUpdate":
        valid_statuses = {"pending", "active", "suspended", "lapsed", "cancelled"}
        if self.status not in valid_statuses:
            raise ValueError(f"Invalid status '{self.status}'. Must be one of: {', '.join(sorted(valid_statuses))}")
        return self


class BulkStatusUpdate(BaseModel):
    member_ids: list[str] = Field(min_length=1)
    status: str = Field(pattern="^(pending|active|suspended|lapsed|cancelled)$")

    @model_validator(mode="after")
    def validate_status(self) -> "BulkStatusUpdate":
        valid_statuses = {"pending", "active", "suspended", "lapsed", "cancelled"}
        if self.status not in valid_statuses:
            raise ValueError(f"Invalid status '{self.status}'. Must be one of: {', '.join(sorted(valid_statuses))}")
        return self


class BulkDeleteRequest(BaseModel):
    member_ids: list[str] = Field(min_length=1)


# ── List / Filter / Paginated ────────────────────────────────

class MemberListParams(BaseModel):
    tier: str | None = None
    status: str | None = None
    search: str | None = None
    group_id: str | None = None
    tags: list[str] | None = None
    joined_after: datetime | None = None
    joined_before: datetime | None = None
    has_profile: bool | None = None
    page: int = 1
    per_page: int = 50
    sort_by: str = "created_at"
    sort_order: str = "desc"


class PaginatedResponse(BaseModel):
    model_config = {"from_attributes": True}

    items: list[UserWithProfile]
    total: int
    page: int
    per_page: int
    pages: int


# ── Tag Schemas ──────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#3B82F6"


class TagResponse(BaseModel):
    id: str
    name: str
    color: str
    member_count: int = 0

    model_config = {"from_attributes": True}


# ── Note Schemas ─────────────────────────────────────────────

class NoteCreate(BaseModel):
    content: str = Field(min_length=1)
    is_pinned: bool = False


class NoteResponse(BaseModel):
    id: str
    content: str
    author_name: str
    is_pinned: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard Stats ──────────────────────────────────────────

class MemberStatsResponse(BaseModel):
    model_config = {"from_attributes": True}

    total: int
    active: int
    pending: int
    lapsed: int
    cancelled: int
    suspended: int = 0
    by_tier: dict[str, int]
    by_group: dict[str, int]
    recent_joins: int  # last 30 days
    avg_engagement: float
    at_risk_count: int
