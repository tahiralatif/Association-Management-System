"""Analytics models — dashboards, reports, KPIs, data exports."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Integer, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ReportType(str, enum.Enum):
    MEMBER = "member"
    FINANCIAL = "financial"
    EVENT = "event"
    COMMUNICATION = "communication"
    ENGAGEMENT = "engagement"
    CUSTOM = "custom"


class ReportFormat(str, enum.Enum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"


class DashboardWidgetType(str, enum.Enum):
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    STAT_CARD = "stat_card"
    TABLE = "table"
    HEATMAP = "heatmap"
    FUNNEL = "funnel"
    GAUGE = "gauge"


# ── Dashboard ────────────────────────────────────────────────

class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    layout: Mapped[dict | None] = mapped_column(JSON, default={})

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Dashboard Widget ─────────────────────────────────────────

class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    dashboard_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("dashboards.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    widget_type: Mapped[DashboardWidgetType] = mapped_column(Enum(DashboardWidgetType))
    data_source: Mapped[str] = mapped_column(String(100))  # e.g., "members.growth", "events.attendance"
    config: Mapped[dict | None] = mapped_column(JSON, default={})  # chart options, filters, etc.
    position: Mapped[dict | None] = mapped_column(JSON)  # {x, y, w, h} for grid layout

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Saved Report ─────────────────────────────────────────────

class SavedReport(Base):
    __tablename__ = "saved_reports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType))
    query_config: Mapped[dict] = mapped_column(JSON)  # filters, date range, group by, etc.
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False)
    schedule_cron: Mapped[str | None] = mapped_column(String(50))  # cron expression
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_result: Mapped[dict | None] = mapped_column(JSON)

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Data Export ──────────────────────────────────────────────

class DataExport(Base):
    __tablename__ = "data_exports"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    export_type: Mapped[str] = mapped_column(String(50))  # members, finances, events, custom
    format: Mapped[ReportFormat] = mapped_column(Enum(ReportFormat), default=ReportFormat.CSV)
    filters: Mapped[dict | None] = mapped_column(JSON, default={})
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, processing, ready, failed
    file_url: Mapped[str | None] = mapped_column(String(500))
    file_size: Mapped[int | None] = mapped_column(Integer)
    record_count: Mapped[int] = mapped_column(Integer, default=0)

    requested_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── KPI Snapshot ─────────────────────────────────────────────

class KPISnapshot(Base):
    __tablename__ = "kpi_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    metric_name: Mapped[str] = mapped_column(String(100), index=True)
    metric_value: Mapped[float] = mapped_column(Integer)
    metric_unit: Mapped[str | None] = mapped_column(String(20))  # count, percentage, currency, etc.
    dimensions: Mapped[dict | None] = mapped_column(JSON, default={})  # category, segment, etc.

    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── AI Insight ───────────────────────────────────────────────

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    title: Mapped[str] = mapped_column(String(300))
    summary: Mapped[str] = mapped_column(Text)
    insight_type: Mapped[str] = mapped_column(String(50))  # trend, anomaly, prediction, recommendation
    source_data: Mapped[dict | None] = mapped_column(JSON)
    confidence: Mapped[float] = mapped_column(Integer, default=0)  # 0-100
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    action_url: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
