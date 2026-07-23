"""Integration and webhook schemas — Pydantic models."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Integration ──────────────────────────────────────────────

class IntegrationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    integration_type: str  # stripe, slack, google_calendar, zapier, custom
    config: dict = {}
    webhook_url: str | None = None


class IntegrationUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None
    webhook_url: str | None = None
    status: str | None = None


class IntegrationResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    integration_type: str
    status: str
    config: dict = {}
    webhook_url: str | None = None
    last_sync_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Webhook ──────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    url: str
    events: list[str] = []
    secret: str | None = None
    is_active: bool = True
    retry_count: int = 3


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    events: list[str] | None = None
    secret: str | None = None
    is_active: bool | None = None
    retry_count: int | None = None


class WebhookResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    url: str
    events: list = []
    is_active: bool
    retry_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── WebhookLog ───────────────────────────────────────────────

class WebhookLogResponse(BaseModel):
    id: str
    webhook_id: str
    tenant_id: str
    event_type: str
    payload: dict = {}
    response_status: int | None = None
    response_body: str | None = None
    success: bool
    attempts: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── IntegrationEvent ─────────────────────────────────────────

class IntegrationEventResponse(BaseModel):
    id: str
    tenant_id: str
    event_type: str
    source_module: str
    payload: dict = {}
    processed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Service-specific configs ─────────────────────────────────

class StripeConfig(BaseModel):
    api_key: str | None = None
    publishable_key: str | None = None
    webhook_secret: str | None = None


class SlackConfig(BaseModel):
    bot_token: str | None = None
    channel_id: str | None = None
    webhook_url: str | None = None


class GoogleCalendarConfig(BaseModel):
    service_account_json: str
    calendar_id: str


class ZapierConfig(BaseModel):
    webhook_url: str
    api_key: str | None = None


# ── Action schemas ───────────────────────────────────────────

class TestConnectionRequest(BaseModel):
    integration_id: str


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    details: dict = {}


class SendWebhookRequest(BaseModel):
    event_type: str
    payload: dict


class DashboardStats(BaseModel):
    total_integrations: int = 0
    active_integrations: int = 0
    failed_integrations: int = 0
    recent_events: int = 0
    recent_webhook_deliveries: int = 0
