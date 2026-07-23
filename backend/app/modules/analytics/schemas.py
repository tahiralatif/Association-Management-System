"""Analytics schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Dashboard ────────────────────────────────────────────────

class DashboardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    is_default: bool = False
    is_public: bool = False
    layout: dict = {}


class DashboardResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    is_default: bool
    is_public: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Widget ───────────────────────────────────────────────────

class WidgetCreate(BaseModel):
    name: str
    widget_type: str
    data_source: str
    config: dict = {}
    position: dict = {}


class WidgetResponse(BaseModel):
    id: str
    dashboard_id: str
    name: str
    widget_type: str
    data_source: str
    config: dict = {}
    position: dict = {}

    model_config = {"from_attributes": True}


# ── Report ───────────────────────────────────────────────────

class ReportCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    report_type: str = "member"
    query_config: dict = {}
    is_scheduled: bool = False
    schedule_cron: str | None = None


class ReportResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    report_type: str
    query_config: dict
    is_scheduled: bool
    last_run_at: datetime | None = None
    last_result: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportRunResponse(BaseModel):
    report_id: str
    result: dict
    executed_at: str


# ── Export ───────────────────────────────────────────────────

class ExportCreate(BaseModel):
    name: str
    export_type: str  # members, finances, events, custom
    format: str = "csv"
    filters: dict = {}


class ExportResponse(BaseModel):
    id: str
    name: str
    export_type: str
    format: str
    status: str
    file_url: str | None = None
    file_size: int | None = None
    record_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── KPI ──────────────────────────────────────────────────────

class KPIRecord(BaseModel):
    metric_name: str
    metric_value: float
    metric_unit: str | None = None
    dimensions: dict = {}
    snapshot_date: datetime


# ── Insight ──────────────────────────────────────────────────

class InsightResponse(BaseModel):
    id: str
    title: str
    summary: str
    insight_type: str
    confidence: float
    is_read: bool
    action_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Overview ─────────────────────────────────────────────────

class AnalyticsOverview(BaseModel):
    total_members: int
    active_members: int
    total_revenue: float
    monthly_recurring: float
    total_events: int
    upcoming_events: int
    total_registrations: int
    emails_sent: int
    open_rate: float
    member_growth: list[dict] = []
    revenue_trend: list[dict] = []
    event_attendance: list[dict] = []
    engagement_score: float = 0.0
    retention_rate: float = 0.0
    churn_rate: float = 0.0
