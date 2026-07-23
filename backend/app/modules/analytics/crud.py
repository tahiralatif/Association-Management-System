"""Analytics CRUD."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.analytics.models import (
    AIInsight,
    Dashboard,
    DashboardWidget,
    DataExport,
    KPISnapshot,
    SavedReport,
)
from app.modules.members.models import MemberProfile, User, MemberStatus
from app.modules.finances.models import Invoice, Payment, Expense, InvoiceStatus
from app.modules.events.models import Event, EventRegistration, EventStatus, RegistrationStatus
from app.modules.communications.models import EmailCampaign, CampaignStatus


# ── Dashboard ────────────────────────────────────────────────

async def create_dashboard(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Dashboard:
    dashboard = Dashboard(tenant_id=tenant_id, created_by=creator_id, **data)
    db.add(dashboard)
    await db.flush()
    return dashboard


async def list_dashboards(db: AsyncSession, tenant_id: str) -> list[Dashboard]:
    result = await db.execute(
        select(Dashboard).where(Dashboard.tenant_id == tenant_id).order_by(Dashboard.is_default.desc(), Dashboard.name)
    )
    return list(result.scalars().all())


async def get_dashboard(db: AsyncSession, dashboard_id: str, tenant_id: str) -> Dashboard | None:
    result = await db.execute(
        select(Dashboard)
        .options(selectinload(Dashboard.widgets))
        .where(Dashboard.id == dashboard_id, Dashboard.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


# ── Widget ───────────────────────────────────────────────────

async def create_widget(db: AsyncSession, dashboard_id: str, tenant_id: str, data: dict) -> DashboardWidget:
    widget = DashboardWidget(dashboard_id=dashboard_id, tenant_id=tenant_id, **data)
    db.add(widget)
    await db.flush()
    return widget


async def delete_widget(db: AsyncSession, widget_id: str) -> bool:
    result = await db.execute(select(DashboardWidget).where(DashboardWidget.id == widget_id))
    widget = result.scalar_one_or_none()
    if not widget:
        return False
    await db.delete(widget)
    await db.flush()
    return True


# ── Reports ──────────────────────────────────────────────────

async def create_report(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> SavedReport:
    report = SavedReport(tenant_id=tenant_id, created_by=creator_id, **data)
    db.add(report)
    await db.flush()
    return report


async def list_reports(db: AsyncSession, tenant_id: str) -> list[SavedReport]:
    result = await db.execute(
        select(SavedReport).where(SavedReport.tenant_id == tenant_id).order_by(SavedReport.name)
    )
    return list(result.scalars().all())


async def get_report(db: AsyncSession, report_id: str, tenant_id: str) -> SavedReport | None:
    result = await db.execute(
        select(SavedReport).where(SavedReport.id == report_id, SavedReport.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def run_report(db: AsyncSession, report_id: str, tenant_id: str) -> dict:
    """Execute a report and return results."""
    report = await get_report(db, report_id, tenant_id)
    if not report:
        raise ValueError("Report not found")

    # Generate report based on type and config
    result = await _generate_report(db, tenant_id, report.query_config)
    report.last_run_at = datetime.now(timezone.utc)
    report.last_result = result
    await db.flush()
    return result


async def _generate_report(db: AsyncSession, tenant_id: str, config: dict) -> dict:
    """Generate report data based on config."""
    report_type = config.get("report_type", "member")

    if report_type == "member":
        total = await db.execute(
            select(func.count()).select_from(MemberProfile).where(MemberProfile.tenant_id == tenant_id)
        )
        active = await db.execute(
            select(func.count()).select_from(MemberProfile).where(
                MemberProfile.tenant_id == tenant_id, MemberProfile.status == MemberStatus.ACTIVE
            )
        )
        return {
            "type": "member",
            "total_members": total.scalar(),
            "active_members": active.scalar(),
        }
    elif report_type == "financial":
        revenue = await db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .join(Invoice)
            .where(Invoice.tenant_id == tenant_id)
        )
        expenses = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(Expense.tenant_id == tenant_id)
        )
        return {
            "type": "financial",
            "total_revenue": float(revenue.scalar()),
            "total_expenses": float(expenses.scalar()),
        }
    elif report_type == "event":
        events = await db.execute(
            select(func.count()).select_from(Event).where(Event.tenant_id == tenant_id)
        )
        registrations = await db.execute(
            select(func.count()).select_from(EventRegistration)
            .join(Event).where(Event.tenant_id == tenant_id)
        )
        return {
            "type": "event",
            "total_events": events.scalar(),
            "total_registrations": registrations.scalar(),
        }

    return {"type": report_type, "message": "Report generated"}


# ── Exports ──────────────────────────────────────────────────

async def create_export(db: AsyncSession, tenant_id: str, requested_by: str, data: dict) -> DataExport:
    export = DataExport(tenant_id=tenant_id, requested_by=requested_by, **data)
    db.add(export)
    await db.flush()
    # In production: trigger Celery task to generate file
    export.status = "ready"
    export.record_count = 0
    await db.flush()
    return export


async def list_exports(db: AsyncSession, tenant_id: str) -> list[DataExport]:
    result = await db.execute(
        select(DataExport).where(DataExport.tenant_id == tenant_id).order_by(DataExport.created_at.desc())
    )
    return list(result.scalars().all())


# ── KPIs ─────────────────────────────────────────────────────

async def record_kpi(db: AsyncSession, tenant_id: str, data: dict) -> KPISnapshot:
    snapshot = KPISnapshot(tenant_id=tenant_id, **data)
    db.add(snapshot)
    await db.flush()
    return snapshot


async def get_kpi_series(
    db: AsyncSession, tenant_id: str, metric_name: str, days: int = 30
) -> list[KPISnapshot]:
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(KPISnapshot)
        .where(
            KPISnapshot.tenant_id == tenant_id,
            KPISnapshot.metric_name == metric_name,
            KPISnapshot.snapshot_date >= since,
        )
        .order_by(KPISnapshot.snapshot_date)
    )
    return list(result.scalars().all())


# ── Insights ─────────────────────────────────────────────────

async def list_insights(db: AsyncSession, tenant_id: str, unread_only: bool = False) -> list[AIInsight]:
    query = select(AIInsight).where(AIInsight.tenant_id == tenant_id, AIInsight.is_dismissed == False)
    if unread_only:
        query = query.where(AIInsight.is_read == False)
    query = query.order_by(AIInsight.created_at.desc()).limit(20)
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_insight_read(db: AsyncSession, insight_id: str) -> bool:
    result = await db.execute(select(AIInsight).where(AIInsight.id == insight_id))
    insight = result.scalar_one_or_none()
    if not insight:
        return False
    insight.is_read = True
    await db.flush()
    return True


# ── Overview ─────────────────────────────────────────────────

async def get_analytics_overview(db: AsyncSession, tenant_id: str) -> dict:
    """Cross-module overview — sequential queries (async session doesn't support concurrent operations)."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)

    # Members
    total_result = await db.execute(
        select(func.count()).select_from(MemberProfile).where(MemberProfile.tenant_id == tenant_id)
    )
    active_result = await db.execute(
        select(func.count()).select_from(MemberProfile).where(
            MemberProfile.tenant_id == tenant_id, MemberProfile.status == MemberStatus.ACTIVE
        )
    )
    total_members = total_result.scalar() or 0
    active_members = active_result.scalar() or 0

    # Revenue
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .join(Invoice)
        .where(Invoice.tenant_id == tenant_id)
    )
    total_revenue = float(revenue_result.scalar())

    # Events
    events_total = await db.execute(
        select(func.count()).select_from(Event).where(Event.tenant_id == tenant_id)
    )
    events_upcoming = await db.execute(
        select(func.count()).select_from(Event).where(
            Event.tenant_id == tenant_id, Event.start_date >= now, Event.status == EventStatus.PUBLISHED
        )
    )
    total_events = events_total.scalar() or 0
    upcoming_events = events_upcoming.scalar() or 0

    # Registrations
    reg_result = await db.execute(
        select(func.count()).select_from(EventRegistration)
        .join(Event).where(Event.tenant_id == tenant_id, EventRegistration.status != RegistrationStatus.CANCELLED)
    )
    total_registrations = reg_result.scalar() or 0

    # Emails
    email_result = await db.execute(
        select(func.coalesce(func.sum(EmailCampaign.sent_count), 0))
        .where(EmailCampaign.tenant_id == tenant_id, EmailCampaign.status == CampaignStatus.SENT)
    )
    emails_sent = int(email_result.scalar())

    return {
        "total_members": total_members,
        "active_members": active_members,
        "total_revenue": total_revenue,
        "monthly_recurring": 0,
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "total_registrations": total_registrations,
        "emails_sent": emails_sent,
        "open_rate": 0,
        "member_growth": [],
        "revenue_trend": [],
        "event_attendance": [],
        "engagement_score": 0,
        "retention_rate": 0,
        "churn_rate": 0,
    }
