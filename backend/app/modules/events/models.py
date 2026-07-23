"""Events models — conferences, workshops, registration, venues."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Integer, Float, JSON, Boolean, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class RegistrationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    WAITLISTED = "waitlisted"
    CHECKED_IN = "checked_in"


class SessionType(str, enum.Enum):
    KEYNOTE = "keynote"
    WORKSHOP = "workshop"
    PANEL = "panel"
    NETWORKING = "networking"
    BREAK = "break"
    CUSTOM = "custom"


class TicketType(str, enum.Enum):
    EARLY_BIRD = "early_bird"
    REGULAR = "regular"
    VIP = "vip"
    STUDENT = "student"
    MEMBER = "member"
    NON_MEMBER = "non_member"
    FREE = "free"


# ── Event ────────────────────────────────────────────────────

class Event(Base):
    """Main event model."""
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(300))
    slug: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    short_description: Mapped[str | None] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(500))
    banner_url: Mapped[str | None] = mapped_column(String(500))

    # Type & Status
    event_type: Mapped[str] = mapped_column(String(50), default="conference")  # conference, workshop, webinar, social, meeting
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), default=EventStatus.DRAFT)
    is_virtual: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hybrid: Mapped[bool] = mapped_column(Boolean, default=False)
    virtual_link: Mapped[str | None] = mapped_column(String(500))
    virtual_platform: Mapped[str | None] = mapped_column(String(50))  # zoom, teams, meet

    # Dates
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    registration_open: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    registration_close: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Location
    venue_name: Mapped[str | None] = mapped_column(String(200))
    venue_address: Mapped[str | None] = mapped_column(Text)
    venue_city: Mapped[str | None] = mapped_column(String(100))
    venue_country: Mapped[str | None] = mapped_column(String(100))
    venue_lat: Mapped[float | None] = mapped_column(Float)
    venue_lng: Mapped[float | None] = mapped_column(Float)

    # Capacity
    max_attendees: Mapped[int | None] = mapped_column(Integer)
    waitlist_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_waitlist: Mapped[int] = mapped_column(Integer, default=50)

    # Pricing
    is_free: Mapped[bool] = mapped_column(Boolean, default=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Metadata
    tags: Mapped[list | None] = mapped_column(JSON, default=[])
    external_url: Mapped[str | None] = mapped_column(String(500))
    contact_email: Mapped[str | None] = mapped_column(String(200))

    # Stats
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    registrations: Mapped[list["EventRegistration"]] = relationship(back_populates="event")
    tickets: Mapped[list["EventTicket"]] = relationship(back_populates="event")
    sessions: Mapped[list["EventSession"]] = relationship(back_populates="event")
    speakers: Mapped[list["EventSpeaker"]] = relationship(back_populates="event")
    sponsors: Mapped[list["EventSponsor"]] = relationship(back_populates="event")
    feedback: Mapped[list["EventFeedback"]] = relationship(back_populates="event")


# ── Event Ticket ───────────────────────────────────────────────────────────

class EventTicket(Base):
    """Ticket types for an event."""
    __tablename__ = "event_tickets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(100))
    ticket_type: Mapped[TicketType] = mapped_column(Enum(TicketType), default=TicketType.REGULAR)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    quantity_available: Mapped[int] = mapped_column(Integer, default=100)
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0)
    max_per_order: Mapped[int] = mapped_column(Integer, default=10)
    sale_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sale_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="tickets")


# ── Event Registration ───────────────────────────────────────

class EventRegistration(Base):
    """Member registration for events."""
    __tablename__ = "event_registrations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    ticket_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("event_tickets.id"))
    status: Mapped[RegistrationStatus] = mapped_column(Enum(RegistrationStatus), default=RegistrationStatus.PENDING)

    # Payment
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    payment_method: Mapped[str | None] = mapped_column(String(50))
    stripe_payment_id: Mapped[str | None] = mapped_column(String(100))

    # Check-in
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    check_in_method: Mapped[str | None] = mapped_column(String(50))  # qr, manual, self

    # Cancellation
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    refund_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    # Dietary & special
    dietary_restrictions: Mapped[str | None] = mapped_column(String(200))
    special_requirements: Mapped[str | None] = mapped_column(Text)
    emergency_contact: Mapped[str | None] = mapped_column(String(200))
    emergency_phone: Mapped[str | None] = mapped_column(String(50))

    # Custom fields
    custom_fields: Mapped[dict | None] = mapped_column(JSON, default={})

    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="registrations")
    member = relationship("MemberProfile")
    ticket = relationship("EventTicket")


# ── Event Session ────────────────────────────────────────────

class EventSession(Base):
    """Sessions within an event (talks, workshops, etc.)."""
    __tablename__ = "event_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    session_type: Mapped[SessionType] = mapped_column(Enum(SessionType), default=SessionType.CUSTOM)

    # Schedule
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    room: Mapped[str | None] = mapped_column(String(100))
    track: Mapped[str | None] = mapped_column(String(100))

    # Capacity
    max_attendees: Mapped[int | None] = mapped_column(Integer)

    # Video
    recording_url: Mapped[str | None] = mapped_column(String(500))
    slides_url: Mapped[str | None] = mapped_column(String(500))

    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="sessions")


# ── Event Speaker ────────────────────────────────────────────

class EventSpeaker(Base):
    """Speakers/presenters for an event."""
    __tablename__ = "event_speakers"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), index=True)
    session_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("event_sessions.id"))
    member_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(200))
    company: Mapped[str | None] = mapped_column(String(200))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    email: Mapped[str | None] = mapped_column(String(200))
    website: Mapped[str | None] = mapped_column(String(500))
    linkedin: Mapped[str | None] = mapped_column(String(500))
    twitter: Mapped[str | None] = mapped_column(String(200))

    is_keynote: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="speakers")


# ── Event Sponsor ────────────────────────────────────────────

class EventSponsor(Base):
    """Sponsors for an event."""
    __tablename__ = "event_sponsors"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    website: Mapped[str | None] = mapped_column(String(500))
    tier: Mapped[str] = mapped_column(String(50), default="bronze")  # platinum, gold, silver, bronze
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="sponsors")


# ── Event Feedback ───────────────────────────────────────────

class EventFeedback(Base):
    """Post-event feedback/reviews."""
    __tablename__ = "event_feedback"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("events.id"), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    session_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("event_sessions.id"))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    rating: Mapped[int] = mapped_column(Integer)  # 1-5
    review: Mapped[str | None] = mapped_column(Text)
    would_recommend: Mapped[bool | None] = mapped_column(Boolean)
    improvements: Mapped[str | None] = mapped_column(Text)

    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="feedback")
