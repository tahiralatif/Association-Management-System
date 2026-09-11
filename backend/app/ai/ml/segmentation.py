"""Smart Member Segmentation — auto-segment members based on behavior.

Segments:
- Champions: High engagement, low churn risk, long tenure, active payments
- Loyal Members: Steady engagement, medium-high scores
- At Risk: Declining engagement, moderate churn risk
- New Members: Joined recently, building engagement
- Dormant: Very low engagement, high churn risk, no recent activity
- High Value: High payment activity and event attendance
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

SEGMENT_DEFINITIONS = {
    "champions": {
        "label": "Champions",
        "description": "Highly engaged, loyal members with strong payment history",
        "color": "#10b981",
        "icon": "🏆",
        "criteria": lambda m: (
            m["engagement_score"] >= 0.7
            and m["churn_risk"] <= 0.3
            and m["tenure_days"] >= 180
            and m["paid_ratio"] >= 0.8
        ),
    },
    "loyal": {
        "label": "Loyal Members",
        "description": "Steady, reliable members with consistent activity",
        "color": "#3b82f6",
        "icon": "💙",
        "criteria": lambda m: (
            0.4 <= m["engagement_score"] < 0.7
            and m["churn_risk"] <= 0.5
            and m["tenure_days"] >= 90
        ),
    },
    "at_risk": {
        "label": "At Risk",
        "description": "Members showing signs of declining engagement",
        "color": "#f59e0b",
        "icon": "⚠️",
        "criteria": lambda m: (
            0.2 <= m["engagement_score"] < 0.5
            and 0.3 < m["churn_risk"] <= 0.7
        ),
    },
    "new": {
        "label": "New Members",
        "description": "Recently joined, still building engagement",
        "color": "#8b5cf6",
        "icon": "🌱",
        "criteria": lambda m: m["tenure_days"] < 90,
    },
    "dormant": {
        "label": "Dormant",
        "description": "Inactive members who haven't engaged recently",
        "color": "#6b7280",
        "icon": "💤",
        "criteria": lambda m: (
            m["engagement_score"] < 0.2
            or (m["days_since_login"] is not None and m["days_since_login"] > 180)
        ),
    },
    "high_value": {
        "label": "High Value",
        "description": "Strong payment activity and event participation",
        "color": "#ec4899",
        "icon": "💎",
        "criteria": lambda m: (
            m["total_payments"] >= 3
            and m["events_attended"] >= 3
            and m["engagement_score"] >= 0.5
        ),
    },
}


async def compute_member_metrics(db, tenant_id: str, member_id: str) -> dict:
    """Compute metrics for segmentation for a single member."""
    from sqlalchemy import select, func
    from app.modules.members.models import MemberProfile, User
    from app.modules.finances.models import Invoice, Payment
    from app.modules.events.models import EventRegistration

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(MemberProfile, User)
        .join(User, MemberProfile.user_id == User.id)
        .where(MemberProfile.id == member_id, MemberProfile.tenant_id == tenant_id)
    )
    row = result.first()
    if not row:
        return {}

    profile, user = row

    # Tenure
    tenure_days = (now - profile.joined_at).days if profile.joined_at else 0

    # Days since login
    days_since_login = (now - user.last_login_at).days if user.last_login_at else 999

    # Events attended
    evt_result = await db.execute(
        select(func.count())
        .select_from(EventRegistration)
        .where(EventRegistration.member_id == member_id, EventRegistration.status.in_(["confirmed", "checked_in"]))
    )
    events_attended = evt_result.scalar() or 0

    # Payments
    payment_result = await db.execute(
        select(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.member_id == member_id, Payment.tenant_id == tenant_id)
    )
    payment_row = payment_result.first()
    total_payments = payment_row[0] or 0
    total_amount = float(payment_row[1] or 0)

    # Invoices
    inv_result = await db.execute(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.member_id == member_id, Invoice.tenant_id == tenant_id, Invoice.status == "paid")
    )
    paid_invoices = inv_result.scalar() or 0

    inv_total_result = await db.execute(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.member_id == member_id, Invoice.tenant_id == tenant_id)
    )
    total_invoices = inv_total_result.scalar() or 0

    paid_ratio = paid_invoices / max(total_invoices, 1)

    return {
        "member_id": member_id,
        "engagement_score": profile.engagement_score,
        "churn_risk": profile.churn_risk,
        "tenure_days": tenure_days,
        "days_since_login": days_since_login,
        "events_attended": events_attended,
        "total_payments": total_payments,
        "total_amount": total_amount,
        "paid_ratio": paid_ratio,
        "has_auto_renew": profile.auto_renew,
    }


async def segment_all_members(db, tenant_id: str) -> dict:
    """Segment all members in a tenant.
    
    Returns:
        {
            "segments": {
                "champions": {"label": "...", "count": 5, "members": [...]},
                ...
            },
            "summary": {"total": 50, "segmented": 48, "unsegmented": 2}
        }
    """
    from sqlalchemy import select
    from app.modules.members.models import MemberProfile, User

    # Get all active members
    result = await db.execute(
        select(MemberProfile.id)
        .join(User, MemberProfile.user_id == User.id)
        .where(MemberProfile.tenant_id == tenant_id, User.is_active == True)
    )
    member_ids = [row[0] for row in result.all()]

    # Initialize segments
    segments = {}
    for key, definition in SEGMENT_DEFINITIONS.items():
        segments[key] = {
            "label": definition["label"],
            "description": definition["description"],
            "color": definition["color"],
            "icon": definition["icon"],
            "count": 0,
            "members": [],
        }

    unsegmented = 0

    for member_id in member_ids:
        metrics = await compute_member_metrics(db, tenant_id, member_id)
        if not metrics:
            unsegmented += 1
            continue

        assigned = False
        # Check segments in priority order: champions first, then others
        for key in ["champions", "high_value", "loyal", "at_risk", "new", "dormant"]:
            criteria = SEGMENT_DEFINITIONS[key]["criteria"]
            if criteria(metrics):
                segments[key]["count"] += 1
                segments[key]["members"].append({
                    "member_id": member_id,
                    "engagement_score": round(metrics["engagement_score"], 4),
                    "churn_risk": round(metrics["churn_risk"], 4),
                    "tenure_days": metrics["tenure_days"],
                })
                assigned = True
                break

        if not assigned:
            # Default to Loyal if nothing else matches
            segments["loyal"]["count"] += 1
            segments["loyal"]["members"].append({
                "member_id": member_id,
                "engagement_score": round(metrics["engagement_score"], 4),
                "churn_risk": round(metrics["churn_risk"], 4),
                "tenure_days": metrics["tenure_days"],
            })

    summary = {
        "total": len(member_ids),
        "segmented": len(member_ids) - unsegmented,
        "unsegmented": unsegmented,
        "segment_counts": {k: v["count"] for k, v in segments.items()},
    }

    logger.info(
        "Segmented %d members for %s: %s",
        len(member_ids) - unsegmented, tenant_id,
        {k: v["count"] for k, v in segments.items()},
    )

    return {"segments": segments, "summary": summary}
