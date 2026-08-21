"""Platform admin endpoints — super_admin only."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, case, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.auth import require_super_admin, TokenPayload
from app.modules.members.models import User
from app.modules.organizations.models import Organization
from app.modules.org_requests.models import OrganizationRequest

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────

class PlatformStats(BaseModel):
    total_organizations: int
    active_organizations: int
    total_users: int
    total_admins: int
    total_members: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    total_requests: int
    active_users: int
    inactive_users: int
    avg_members_per_org: float


class OrgSummary(BaseModel):
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    is_active: bool
    tenant_id: str
    user_count: int = 0
    admin_email: Optional[str] = None


class UserSummary(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    roles: list[str]
    tenant_id: str
    is_active: bool
    email_verified: bool


class TimeSeriesPoint(BaseModel):
    label: str
    users: int = 0
    cum_users: int = 0
    organizations: int = 0
    cum_organizations: int = 0
    requests: int = 0
    approved: int = 0
    pending: int = 0
    rejected: int = 0
    active_users: int = 0


class PlatformAnalytics(BaseModel):
    time_series: list[TimeSeriesPoint]
    requests_by_status: dict[str, int]
    users_by_role: dict[str, int]
    top_organizations: list[dict]
    org_size_distribution: list[dict]
    monthly_summary: dict  # this month vs last month deltas


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    user: TokenPayload = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide statistics."""
    r = await db.execute(select(func.count()).select_from(Organization))
    total_orgs = r.scalar() or 0
    r = await db.execute(select(func.count()).select_from(Organization).where(Organization.is_active == True))
    active_orgs = r.scalar() or 0

    r = await db.execute(select(func.count()).select_from(User))
    total_users = r.scalar() or 0

    r = await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )
    active_users = r.scalar() or 0
    inactive_users = total_users - active_users

    r = await db.execute(
        select(func.count()).select_from(User).where(
            text("roles::text LIKE '%\"super_admin\"%' OR roles::text LIKE '%\"tenant_admin\"%' OR roles::text LIKE '%\"staff\"%'")
        )
    )
    total_admins = r.scalar() or 0
    total_members = total_users - total_admins

    r = await db.execute(select(func.count()).select_from(OrganizationRequest))
    total_requests = r.scalar() or 0
    r = await db.execute(select(func.count()).select_from(OrganizationRequest).where(OrganizationRequest.status == "pending"))
    pending = r.scalar() or 0
    r = await db.execute(select(func.count()).select_from(OrganizationRequest).where(OrganizationRequest.status == "approved"))
    approved = r.scalar() or 0
    r = await db.execute(select(func.count()).select_from(OrganizationRequest).where(OrganizationRequest.status == "rejected"))
    rejected = r.scalar() or 0

    avg_members = round(total_members / total_orgs, 1) if total_orgs > 0 else 0

    return PlatformStats(
        total_organizations=total_orgs,
        active_organizations=active_orgs,
        total_users=total_users,
        total_admins=total_admins,
        total_members=total_members,
        pending_requests=pending,
        approved_requests=approved,
        rejected_requests=rejected,
        total_requests=total_requests,
        active_users=active_users,
        inactive_users=inactive_users,
        avg_members_per_org=avg_members,
    )


@router.get("/analytics", response_model=PlatformAnalytics)
async def platform_analytics(
    months: int = Query(6, ge=1, le=24),
    user: TokenPayload = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Detailed platform analytics with time-series data."""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=30 * months)

    time_series = []
    cum_users = 0
    cum_orgs = 0

    for i in range(months - 1, -1, -1):
        month_start = now - timedelta(days=30 * (i + 1))
        month_end = now - timedelta(days=30 * i)
        label = month_start.strftime("%b %Y")

        r = await db.execute(
            select(func.count()).select_from(User).where(
                User.created_at >= month_start, User.created_at < month_end
            )
        )
        users_count = r.scalar() or 0
        cum_users += users_count

        r = await db.execute(
            select(func.count()).select_from(Organization).where(
                Organization.created_at >= month_start, Organization.created_at < month_end
            )
        )
        orgs_count = r.scalar() or 0
        cum_orgs += orgs_count

        r = await db.execute(
            select(func.count()).select_from(OrganizationRequest).where(
                OrganizationRequest.created_at >= month_start, OrganizationRequest.created_at < month_end
            )
        )
        req_count = r.scalar() or 0

        r = await db.execute(
            select(func.count()).select_from(OrganizationRequest).where(
                OrganizationRequest.status == "approved",
                OrganizationRequest.created_at >= month_start, OrganizationRequest.created_at < month_end,
            )
        )
        approved_count = r.scalar() or 0

        r = await db.execute(
            select(func.count()).select_from(OrganizationRequest).where(
                OrganizationRequest.status == "pending",
                OrganizationRequest.created_at >= month_start, OrganizationRequest.created_at < month_end,
            )
        )
        pending_count = r.scalar() or 0

        r = await db.execute(
            select(func.count()).select_from(OrganizationRequest).where(
                OrganizationRequest.status == "rejected",
                OrganizationRequest.created_at >= month_start, OrganizationRequest.created_at < month_end,
            )
        )
        rejected_count = r.scalar() or 0

        r = await db.execute(
            select(func.count()).select_from(User).where(
                User.is_active == True,
                User.created_at <= month_end,
            )
        )
        active_users_count = r.scalar() or 0

        time_series.append(TimeSeriesPoint(
            label=label, users=users_count, cum_users=cum_users,
            organizations=orgs_count, cum_organizations=cum_orgs,
            requests=req_count, approved=approved_count, pending=pending_count,
            rejected=rejected_count, active_users=active_users_count,
        ))

    # Requests by status
    requests_by_status = {}
    for status in ["pending", "approved", "rejected"]:
        r = await db.execute(
            select(func.count()).select_from(OrganizationRequest).where(OrganizationRequest.status == status)
        )
        requests_by_status[status] = r.scalar() or 0

    # Users by role
    users_by_role = {}
    for role in ["super_admin", "tenant_admin", "staff", "member"]:
        r = await db.execute(
            select(func.count()).select_from(User).where(text(f"roles::text LIKE '%\"{role}\"%'"))
        )
        users_by_role[role] = r.scalar() or 0

    # Top organizations
    orgs_result = await db.execute(select(Organization).limit(100))
    all_orgs = orgs_result.scalars().all()
    top_orgs = []
    for org in all_orgs:
        r = await db.execute(
            select(func.count()).select_from(User).where(User.tenant_id == org.tenant_id)
        )
        user_count = r.scalar() or 0
        top_orgs.append({"name": org.name, "slug": org.slug, "users": user_count})
    top_orgs.sort(key=lambda x: x["users"], reverse=True)
    top_orgs = top_orgs[:10]

    # Org size distribution (buckets)
    size_dist = {"1-10": 0, "11-50": 0, "51-100": 0, "100+": 0}
    for org in all_orgs:
        r = await db.execute(
            select(func.count()).select_from(User).where(User.tenant_id == org.tenant_id)
        )
        count = r.scalar() or 0
        if count <= 10:
            size_dist["1-10"] += 1
        elif count <= 50:
            size_dist["11-50"] += 1
        elif count <= 100:
            size_dist["51-100"] += 1
        else:
            size_dist["100+"] += 1

    org_size_distribution = [{"range": k, "count": v} for k, v in size_dist.items()]

    # Monthly summary (this month vs last month)
    this_month_start = now - timedelta(days=30)
    last_month_start = now - timedelta(days=60)

    r = await db.execute(
        select(func.count()).select_from(User).where(User.created_at >= this_month_start)
    )
    new_users_this = r.scalar() or 0
    r = await db.execute(
        select(func.count()).select_from(User).where(
            User.created_at >= last_month_start, User.created_at < this_month_start
        )
    )
    new_users_last = r.scalar() or 0

    r = await db.execute(
        select(func.count()).select_from(OrganizationRequest).where(
            OrganizationRequest.created_at >= this_month_start, OrganizationRequest.status == "approved"
        )
    )
    approved_this = r.scalar() or 0
    r = await db.execute(
        select(func.count()).select_from(OrganizationRequest).where(
            OrganizationRequest.created_at >= last_month_start,
            OrganizationRequest.created_at < this_month_start,
            OrganizationRequest.status == "approved",
        )
    )
    approved_last = r.scalar() or 0

    monthly_summary = {
        "new_users_this_month": new_users_this,
        "new_users_last_month": new_users_last,
        "approved_this_month": approved_this,
        "approved_last_month": approved_last,
    }

    return PlatformAnalytics(
        time_series=time_series,
        requests_by_status=requests_by_status,
        users_by_role=users_by_role,
        top_organizations=top_orgs,
        org_size_distribution=org_size_distribution,
        monthly_summary=monthly_summary,
    )


@router.get("/organizations", response_model=list[OrgSummary])
async def list_organizations(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    orgs_result = await db.execute(
        select(Organization).order_by(Organization.name).offset(offset).limit(per_page)
    )
    orgs = orgs_result.scalars().all()
    summaries = []
    for org in orgs:
        r = await db.execute(select(func.count()).select_from(User).where(User.tenant_id == org.tenant_id))
        user_count = r.scalar() or 0
        r = await db.execute(
            select(User.email).where(
                User.tenant_id == org.tenant_id,
                text("roles::text LIKE '%\"tenant_admin\"%'")
            ).limit(1)
        )
        admin_row = r.first()
        summaries.append(OrgSummary(
            id=str(org.id), slug=org.slug, name=org.name, description=org.description,
            is_active=org.is_active, tenant_id=org.tenant_id, user_count=user_count,
            admin_email=admin_row[0] if admin_row else None,
        ))
    return summaries


@router.get("/organizations/export/csv")
async def export_organizations_csv(
    user: TokenPayload = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export all organizations as CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse

    orgs_result = await db.execute(
        select(Organization).order_by(Organization.name)
    )
    orgs = orgs_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Slug", "Status", "User Count", "Admin Email", "Created Date"])

    for org in orgs:
        r = await db.execute(select(func.count()).select_from(User).where(User.tenant_id == org.tenant_id))
        user_count = r.scalar() or 0
        r = await db.execute(
            select(User.email).where(
                User.tenant_id == org.tenant_id,
                text("roles::text LIKE '%\"tenant_admin\"%'")
            ).limit(1)
        )
        admin_row = r.first()
        created = org.created_at.strftime("%Y-%m-%d %H:%M") if org.created_at else ""
        writer.writerow([
            org.name,
            org.slug,
            "Active" if org.is_active else "Inactive",
            user_count,
            admin_row[0] if admin_row else "",
            created,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=organizations.csv"},
    )


@router.get("/users", response_model=list[UserSummary])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    users_result = await db.execute(select(User).order_by(User.email).offset(offset).limit(per_page))
    users = users_result.scalars().all()
    return [
        UserSummary(
            id=str(u.id), email=u.email, first_name=u.first_name or "", last_name=u.last_name or "",
            roles=u.roles or [], tenant_id=u.tenant_id, is_active=u.is_active, email_verified=u.email_verified,
        )
        for u in users
    ]
