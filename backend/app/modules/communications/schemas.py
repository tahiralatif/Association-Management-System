"""Communications schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Email Campaign ───────────────────────────────────────────

class EmailCampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    subject: str = Field(min_length=1, max_length=500)
    preview_text: str | None = None
    html_body: str
    plain_body: str | None = None
    target_segments: list[str] = []
    target_group_ids: list[str] = []
    target_all: bool = False
    from_name: str
    from_email: str
    reply_to: str | None = None


class EmailCampaignUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    html_body: str | None = None
    target_segments: list[str] | None = None
    status: str | None = None
    scheduled_at: datetime | None = None


class EmailCampaignResponse(BaseModel):
    id: str
    name: str
    subject: str
    status: str
    total_recipients: int
    sent_count: int
    delivered_count: int
    opened_count: int
    clicked_count: int
    bounced_count: int
    open_rate: float = 0.0
    click_rate: float = 0.0
    scheduled_at: datetime | None = None
    sent_at: datetime | None = None
    from_name: str
    from_email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Announcement ─────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    summary: str | None = None
    content: str
    image_url: str | None = None
    audience: str = "all"
    is_pinned: bool = False
    allow_comments: bool = True
    expires_at: datetime | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    status: str | None = None
    is_pinned: bool | None = None
    expires_at: datetime | None = None


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    slug: str
    summary: str | None = None
    content: str
    image_url: str | None = None
    audience: str
    status: str
    is_pinned: bool
    allow_comments: bool
    view_count: int
    published_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Survey ───────────────────────────────────────────────────

class SurveyQuestion(BaseModel):
    type: str  # text, multiple_choice, rating, yes_no
    question: str
    required: bool = True
    options: list[str] = []
    scale: int = 5  # for rating type


class SurveyCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    questions: list[SurveyQuestion]
    target_segments: list[str] = []
    target_all: bool = False
    is_anonymous: bool = False
    closes_at: datetime | None = None


class SurveyResponseSchema(BaseModel):
    id: str
    title: str
    description: str | None = None
    status: str
    is_anonymous: bool
    total_invited: int
    response_count: int
    response_rate: float = 0.0
    opens_at: datetime | None = None
    closes_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SurveySubmitAnswer(BaseModel):
    question_index: int
    answer: str | int | float


class SurveySubmit(BaseModel):
    answers: list[SurveySubmitAnswer]


# ── Notification ─────────────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: str
    title: str = Field(min_length=1, max_length=200)
    message: str
    link: str | None = None
    notification_type: str = "info"


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    link: str | None = None
    notification_type: str
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Email Template ───────────────────────────────────────────

class EmailTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    subject: str
    html_body: str
    plain_body: str | None = None
    variables: list[str] = []
    category: str = "general"


class EmailTemplateResponse(BaseModel):
    id: str
    name: str
    subject: str
    variables: list[str]
    category: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ────────────────────────────────────────────────

class CommunicationsSummary(BaseModel):
    total_campaigns: int
    total_emails_sent: int
    average_open_rate: float
    average_click_rate: float
    active_announcements: int
    active_surveys: int
    unread_notifications: int
    recent_messages: list[dict]
    channel_breakdown: dict[str, int]  # {"email": 500, "sms": 50, "push": 200}
