"""Communications models — emails, announcements, surveys, templates."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Integer, Float, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ChannelType(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class AnnouncementStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SurveyStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    PAUSED = "paused"
    CANCELLED = "cancelled"


# ── Email Campaign ───────────────────────────────────────────

class EmailCampaign(Base):
    """Email campaigns with tracking."""
    __tablename__ = "email_campaigns"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(500))
    preview_text: Mapped[str | None] = mapped_column(String(200))
    html_body: Mapped[str] = mapped_column(Text)
    plain_body: Mapped[str | None] = mapped_column(Text)

    # Targeting
    target_segments: Mapped[list | None] = mapped_column(JSON, default=[])  # ["tier:premium", "tag:board"]
    target_group_ids: Mapped[list | None] = mapped_column(JSON, default=[])
    target_all: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)

    # Stats
    total_recipients: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0)
    opened_count: Mapped[int] = mapped_column(Integer, default=0)
    clicked_count: Mapped[int] = mapped_column(Integer, default=0)
    bounced_count: Mapped[int] = mapped_column(Integer, default=0)
    unsubscribed_count: Mapped[int] = mapped_column(Integer, default=0)

    # Schedule
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # From
    from_name: Mapped[str] = mapped_column(String(100))
    from_email: Mapped[str] = mapped_column(String(200))
    reply_to: Mapped[str | None] = mapped_column(String(200))

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Announcement ─────────────────────────────────────────────

class Announcement(Base):
    """Site-wide announcements and news."""
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(300))
    slug: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))

    # Targeting
    audience: Mapped[str] = mapped_column(String(50), default="all")  # all, members_only, tier:premium
    target_group_ids: Mapped[list | None] = mapped_column(JSON, default=[])

    # Status
    status: Mapped[AnnouncementStatus] = mapped_column(Enum(AnnouncementStatus), default=AnnouncementStatus.DRAFT)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_comments: Mapped[bool] = mapped_column(Boolean, default=True)

    # Schedule
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Stats
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Survey ───────────────────────────────────────────────────

class Survey(Base):
    """Member surveys and feedback forms."""
    __tablename__ = "surveys"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    questions: Mapped[list] = mapped_column(JSON, default=[])
    # [{type: "text", question: "...", required: true, options: []},
    #  {type: "multiple_choice", question: "...", options: ["A","B","C"]},
    #  {type: "rating", question: "...", scale: 5}]

    # Targeting
    target_segments: Mapped[list | None] = mapped_column(JSON, default=[])
    target_all: Mapped[bool] = mapped_column(Boolean, default=False)

    # Status
    status: Mapped[SurveyStatus] = mapped_column(Enum(SurveyStatus), default=SurveyStatus.DRAFT)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)

    # Schedule
    opens_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Stats
    total_invited: Mapped[int] = mapped_column(Integer, default=0)
    response_count: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SurveyResponse(Base):
    """Individual survey responses."""
    __tablename__ = "survey_responses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    survey_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("surveys.id"), index=True)
    respondent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    answers: Mapped[list] = mapped_column(JSON, default=[])
    # [{question_index: 0, answer: "..."}]

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Notification ─────────────────────────────────────────────

class Notification(Base):
    """In-app notifications."""
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)

    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(500))
    notification_type: Mapped[str] = mapped_column(String(50))  # info, warning, success, system

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Email Template ───────────────────────────────────────────

class EmailTemplate(Base):
    """Reusable email templates."""
    __tablename__ = "email_templates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(500))
    html_body: Mapped[str] = mapped_column(Text)
    plain_body: Mapped[str | None] = mapped_column(Text)
    variables: Mapped[list | None] = mapped_column(JSON, default=[])  # ["first_name", "event_name"]
    category: Mapped[str] = mapped_column(String(50), default="general")  # general, transactional, marketing

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Message Log ──────────────────────────────────────────────

class MessageLog(Base):
    """Log of all sent messages (email, SMS, push)."""
    __tablename__ = "message_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    channel: Mapped[ChannelType] = mapped_column(Enum(ChannelType))
    recipient_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    recipient_email: Mapped[str | None] = mapped_column(String(200))
    recipient_phone: Mapped[str | None] = mapped_column(String(50))

    subject: Mapped[str | None] = mapped_column(String(500))
    body_preview: Mapped[str | None] = mapped_column(String(500))

    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent, delivered, opened, clicked, bounced, failed
    campaign_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("email_campaigns.id"))

    # Tracking
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    clicked_link: Mapped[str | None] = mapped_column(String(500))

    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Email Sending Log ────────────────────────────────────────

class EmailSendStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"


class EmailSendingLog(Base):
    """Detailed log of every email send attempt with retry tracking."""
    __tablename__ = "email_sending_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    # Recipient
    recipient_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)
    recipient_email: Mapped[str] = mapped_column(String(200), index=True)

    # Content
    subject: Mapped[str] = mapped_column(String(500))
    body_preview: Mapped[str | None] = mapped_column(String(500))

    # Status & provider
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending, sent, failed, bounced
    provider: Mapped[str] = mapped_column(String(50), default="smtp")  # smtp, sendgrid, ses, resend
    error_message: Mapped[str | None] = mapped_column(Text)

    # Relationships
    template_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("email_templates.id"))
    campaign_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("email_campaigns.id"))

    # Retry tracking
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)

    # Timestamps
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
