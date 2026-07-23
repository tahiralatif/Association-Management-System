"""Analytics routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin, require_staff, get_current_user, TokenPayload
from app.core.database import get_db
from app.modules.analytics import crud
from app.modules.analytics.schemas import (
    AnalyticsOverview,
    DashboardCreate,
    DashboardResponse,
    ExportCreate,
    ExportResponse,
    InsightResponse,
    ReportCreate,
    ReportResponse,
    ReportRunResponse,
    WidgetCreate,
    WidgetResponse,
)

router = APIRouter()


# ── Overview ─────────────────────────────────────────────────

@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    data = await crud.get_analytics_overview(db, user.tenant_id)
    return AnalyticsOverview(**data)


# ── Dashboards ───────────────────────────────────────────────

@router.get("/dashboards")
async def list_dashboards(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    dashboards = await crud.list_dashboards(db, user.tenant_id)
    return [DashboardResponse.model_validate(d) for d in dashboards]


@router.get("/dashboards/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    dashboard = await crud.get_dashboard(db, dashboard_id, user.tenant_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    widgets = [WidgetResponse(
        id=w.id, dashboard_id=w.dashboard_id, name=w.name,
        widget_type=str(w.widget_type), data_source=w.data_source,
        config=w.config or {}, position=w.position or {},
    ) for w in dashboard.widgets]
    return {
        **DashboardResponse.model_validate(dashboard).model_dump(),
        "widgets": widgets,
    }


@router.post("/dashboards", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    data: DashboardCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    dashboard = await crud.create_dashboard(db, user.tenant_id, user.sub, data.model_dump())
    return DashboardResponse.model_validate(dashboard)


@router.post("/dashboards/{dashboard_id}/widgets", response_model=WidgetResponse, status_code=status.HTTP_201_CREATED)
async def add_widget(
    dashboard_id: str,
    data: WidgetCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    widget = await crud.create_widget(db, dashboard_id, user.tenant_id, data.model_dump())
    return WidgetResponse.model_validate(widget)


@router.delete("/widgets/{widget_id}")
async def remove_widget(
    widget_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await crud.delete_widget(db, widget_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Widget not found")
    return {"message": "Widget removed"}


# ── Reports ──────────────────────────────────────────────────

@router.get("/reports")
async def list_reports(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    reports = await crud.list_reports(db, user.tenant_id)
    return [ReportResponse.model_validate(r) for r in reports]


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    report = await crud.get_report(db, report_id, user.tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse.model_validate(report)


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    data: ReportCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    report = await crud.create_report(db, user.tenant_id, user.sub, data.model_dump())
    return ReportResponse.model_validate(report)


@router.post("/reports/{report_id}/run")
async def run_report(
    report_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await crud.run_report(db, report_id, user.tenant_id)
        return ReportRunResponse(report_id=report_id, result=result, executed_at=datetime.now(timezone.utc).isoformat())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Exports ──────────────────────────────────────────────────

@router.get("/exports")
async def list_exports(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    exports = await crud.list_exports(db, user.tenant_id)
    return [ExportResponse.model_validate(e) for e in exports]


@router.post("/exports", response_model=ExportResponse, status_code=status.HTTP_201_CREATED)
async def create_export(
    data: ExportCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    export = await crud.create_export(db, user.tenant_id, user.sub, data.model_dump())
    return ExportResponse.model_validate(export)


# ── KPIs ─────────────────────────────────────────────────────

@router.get("/kpis/{metric_name}")
async def get_kpi_series(
    metric_name: str,
    days: int = Query(30, ge=1, le=365),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    series = await crud.get_kpi_series(db, user.tenant_id, metric_name, days)
    return [{"date": k.snapshot_date.isoformat(), "value": float(k.metric_value), "unit": k.metric_unit} for k in series]


# ── Insights ─────────────────────────────────────────────────

@router.get("/insights")
async def list_insights(
    unread_only: bool = Query(False),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    insights = await crud.list_insights(db, user.tenant_id, unread_only)
    return [InsightResponse.model_validate(i) for i in insights]


@router.patch("/insights/{insight_id}/read")
async def mark_insight_read(
    insight_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    ok = await crud.mark_insight_read(db, insight_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Insight not found")
    return {"message": "Marked as read"}
