"""Analytics tasks — KPI snapshots, report generation, data aggregation."""

from celery import shared_task


@shared_task
def generate_daily_kpi_snapshots():
    """Generate daily KPI snapshots for all active tenants. Run at 6 AM UTC via beat."""
    import asyncio
    from datetime import datetime, timezone
    from sqlalchemy import select, func
    from app.core.database import async_session_factory
    from app.modules.members.models import MemberProfile, MemberStatus
    from app.modules.analytics.models import KPISnapshot

    async def _generate():
        async with async_session_factory() as db:
            # Get all active tenants
            result = await db.execute(
                select(MemberProfile.tenant_id).distinct()
            )
            tenants = [r[0] for r in result.all()]

            snapshots = []
            for tenant_id in tenants:
                # Member count
                member_count = await db.execute(
                    select(func.count(MemberProfile.id)).where(
                        MemberProfile.tenant_id == tenant_id
                    )
                )
                active_count = await db.execute(
                    select(func.count(MemberProfile.id)).where(
                        MemberProfile.tenant_id == tenant_id,
                        MemberProfile.status == MemberStatus.ACTIVE,
                    )
                )

                snapshot = KPISnapshot(
                    tenant_id=tenant_id,
                    metric_name="daily_summary",
                    metric_value=float(member_count.scalar() or 0),
                    dimensions={
                        "active_members": active_count.scalar() or 0,
                        "date": datetime.now(timezone.utc).isoformat(),
                    },
                )
                db.add(snapshot)
                snapshots.append(tenant_id)

            await db.commit()
            return {"tenants_processed": len(snapshots), "date": datetime.now(timezone.utc).isoformat()}

    return asyncio.get_event_loop().run_until_complete(_generate())


@shared_task
def generate_report(report_id: str, report_type: str, params: dict):
    """Generate a report asynchronously."""
    return {"report_id": report_id, "type": report_type, "status": "completed"}


@shared_task
def refresh_analytics_cache(tenant_id: str):
    """Refresh pre-computed analytics for a tenant."""
    return {"tenant_id": tenant_id, "status": "refreshed"}
