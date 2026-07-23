"""Events schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Event ────────────────────────────────────────────────────

class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    description: str | None = None
    short_description: str | None = None
    event_type: str = "conference"
    is_virtual: bool = False
    is_hybrid: bool = False
    virtual_link: str | None = None
    virtual_platform: str | None = None
    start_date: datetime
    end_date: datetime
    registration_open: datetime | None = None
    registration_close: datetime | None = None
    venue_name: str | None = None
    venue_address: str | None = None
    venue_city: str | None = None
    venue_country: str | None = None
    max_attendees: int | None = None
    waitlist_enabled: bool = True
    is_free: bool = True
    currency: str = "USD"
    tags: list[str] = []
    contact_email: str | None = None


class EventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_attendees: int | None = None
    virtual_link: str | None = None


class EventResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    short_description: str | None = None
    event_type: str
    status: str
    is_virtual: bool
    is_hybrid: bool
    start_date: datetime
    end_date: datetime
    venue_name: str | None = None
    venue_city: str | None = None
    venue_country: str | None = None
    max_attendees: int | None = None
    is_free: bool
    currency: str
    tags: list[str] = []
    registration_count: int = 0
    view_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Event Detail (with sessions, speakers, etc.) ─────────────

class SpeakerResponse(BaseModel):
    id: str
    name: str
    title: str | None = None
    company: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    is_keynote: bool = False

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    session_type: str
    start_time: datetime
    end_time: datetime
    room: str | None = None
    track: str | None = None
    speakers: list[SpeakerResponse] = []

    model_config = {"from_attributes": True}


class TicketResponse(BaseModel):
    id: str
    name: str
    ticket_type: str
    price: float
    currency: str
    quantity_available: int
    quantity_sold: int
    is_active: bool

    model_config = {"from_attributes": True}


class SponsorResponse(BaseModel):
    id: str
    name: str
    logo_url: str | None = None
    website: str | None = None
    tier: str
    description: str | None = None

    model_config = {"from_attributes": True}


class EventDetailResponse(EventResponse):
    sessions: list[SessionResponse] = []
    speakers: list[SpeakerResponse] = []
    tickets: list[TicketResponse] = []
    sponsors: list[SponsorResponse] = []


# ── Registration ─────────────────────────────────────────────

class RegistrationCreate(BaseModel):
    ticket_id: str | None = None
    dietary_restrictions: str | None = None
    special_requirements: str | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    custom_fields: dict = {}


class RegistrationResponse(BaseModel):
    id: str
    event_id: str
    member_id: str
    member_name: str = ""
    ticket_id: str | None = None
    ticket_name: str = ""
    status: str
    amount_paid: float
    checked_in_at: datetime | None = None
    registered_at: datetime

    model_config = {"from_attributes": True}


class CheckInRequest(BaseModel):
    method: str = "manual"  # qr, manual, self


# ── Ticket ───────────────────────────────────────────────────

class TicketCreate(BaseModel):
    name: str
    ticket_type: str = "regular"
    description: str | None = None
    price: float = 0
    currency: str = "USD"
    quantity_available: int = 100
    max_per_order: int = 10
    sale_start: datetime | None = None
    sale_end: datetime | None = None


# ── Speaker ──────────────────────────────────────────────────

class SpeakerCreate(BaseModel):
    name: str
    title: str | None = None
    company: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    email: str | None = None
    website: str | None = None
    linkedin: str | None = None
    is_keynote: bool = False


# ── Session ──────────────────────────────────────────────────

class SessionCreate(BaseModel):
    title: str
    description: str | None = None
    session_type: str = "custom"
    start_time: datetime
    end_time: datetime
    room: str | None = None
    track: str | None = None
    max_attendees: int | None = None


# ── Feedback ─────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    review: str | None = None
    would_recommend: bool | None = None
    improvements: str | None = None
    session_id: str | None = None
    is_anonymous: bool = False


class FeedbackResponse(BaseModel):
    id: str
    rating: int
    review: str | None = None
    would_recommend: bool | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ────────────────────────────────────────────────

class EventStats(BaseModel):
    total_events: int
    upcoming_events: int
    total_registrations: int
    total_revenue: float
    average_rating: float
    check_in_rate: float
    upcoming: list[dict] = []
    recent_registrations: list[dict] = []
