"""Member management models — complete."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Float, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MembershipTier(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    CORPORATE = "corporate"
    LIFETIME = "lifetime"


class MemberStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    LAPSED = "lapsed"
    CANCELLED = "cancelled"


class GroupType(str, enum.Enum):
    CHAPTER = "chapter"
    COMMITTEE = "committee"
    INTEREST_GROUP = "interest_group"
    WORKING_GROUP = "working_group"
    BOARD = "board"


class GroupMemberRole(str, enum.Enum):
    MEMBER = "member"
    CHAIR = "chair"
    CO_CHAIR = "co_chair"
    SECRETARY = "secretary"
    TREASURER = "treasurer"


# ── User ─────────────────────────────────────────────────────

class User(Base):
    """System user (admin, staff, or member)."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    roles: Mapped[list] = mapped_column(JSON, default=["member"])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verification_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    member_profile: Mapped["MemberProfile | None"] = relationship(back_populates="user", uselist=False)
    activity_logs: Mapped[list["MemberActivityLog"]] = relationship(back_populates="user")


# ── Member Profile ───────────────────────────────────────────

class MemberProfile(Base):
    """Extended member profile with association-specific data."""
    __tablename__ = "member_profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True)

    # Membership
    member_number: Mapped[str | None] = mapped_column(String(50), unique=True)
    tier: Mapped[MembershipTier] = mapped_column(Enum(MembershipTier), default=MembershipTier.BASIC)
    status: Mapped[MemberStatus] = mapped_column(Enum(MemberStatus), default=MemberStatus.PENDING)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    renewal_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)

    # Profile
    phone: Mapped[str | None] = mapped_column(String(20))
    organization: Mapped[str | None] = mapped_column(String(200))
    job_title: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    address: Mapped[dict | None] = mapped_column(JSON)  # {street, city, state, zip, country}
    social_links: Mapped[dict | None] = mapped_column(JSON)  # {linkedin, twitter, website}

    # Tags & Preferences
    tags: Mapped[list | None] = mapped_column(JSON, default=[])  # ["board-member", "volunteer"]
    interests: Mapped[list | None] = mapped_column(JSON, default=[])  # ["governance", "fundraising"]
    email_opt_in: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)

    # AI-computed
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)
    churn_risk: Mapped[float] = mapped_column(Float, default=0.0)
    lifetime_value: Mapped[float] = mapped_column(Float, default=0.0)

    # Custom fields (tenant-specific)
    custom_fields: Mapped[dict | None] = mapped_column(JSON, default={})

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="member_profile")
    group_memberships: Mapped[list["MemberGroupMembership"]] = relationship(back_populates="member")
    notes: Mapped[list["MemberNote"]] = relationship(back_populates="member")
    tags_relations: Mapped[list["MemberTag"]] = relationship(back_populates="members", secondary="member_profile_tags")


# ── Groups ───────────────────────────────────────────────────

class MemberGroup(Base):
    """Groups, chapters, committees."""
    __tablename__ = "member_groups"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    group_type: Mapped[GroupType] = mapped_column(Enum(GroupType), default=GroupType.COMMITTEE)
    parent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("member_groups.id"))
    max_members: Mapped[int | None] = mapped_column()
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    meeting_schedule: Mapped[str | None] = mapped_column(String(200))  # "Every 1st Monday"
    contact_email: Mapped[str | None] = mapped_column(String(255))
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    parent: Mapped["MemberGroup | None"] = relationship(remote_side="MemberGroup.id")
    memberships: Mapped[list["MemberGroupMembership"]] = relationship(back_populates="group")


# ── Group Membership ─────────────────────────────────────────

class MemberGroupMembership(Base):
    """Many-to-many: members ↔ groups."""
    __tablename__ = "member_group_memberships"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    group_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_groups.id"))
    role: Mapped[GroupMemberRole] = mapped_column(Enum(GroupMemberRole), default=GroupMemberRole.MEMBER)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    member: Mapped["MemberProfile"] = relationship(back_populates="group_memberships")
    group: Mapped["MemberGroup"] = relationship(back_populates="memberships")


# ── Tags ─────────────────────────────────────────────────────

class MemberTag(Base):
    """Tags for categorizing members."""
    __tablename__ = "member_tags"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(7), default="#3B82F6")  # hex color
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    members: Mapped[list["MemberProfile"]] = relationship(
        secondary="member_profile_tags", back_populates="tags_relations"
    )


class MemberProfileTag(Base):
    """Association table for member ↔ tag."""
    __tablename__ = "member_profile_tags"

    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"), primary_key=True)
    tag_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_tags.id"), primary_key=True)


# ── Notes ────────────────────────────────────────────────────

class MemberNote(Base):
    """Internal notes about a member (staff only)."""
    __tablename__ = "member_notes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    author_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    member: Mapped["MemberProfile"] = relationship(back_populates="notes")


# ── Activity Log ─────────────────────────────────────────────

class MemberActivityLog(Base):
    """Tracks member activity for engagement scoring."""
    __tablename__ = "member_activity_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))  # "login", "profile_updated", "event_registered"
    details: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship(back_populates="activity_logs")
