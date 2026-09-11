"""Real Engagement Scoring — weighted multi-factor scoring system.

Scoring factors:
- Event attendance (25%)
- Payment timeliness (25%)
- Email engagement (20%)
- Login frequency (15%)
- Group participation (15%)

Normalized to 0.0 – 1.0 scale.
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# Weights for each factor
WEIGHTS = {
    "event_attendance": 0.25,
    "payment_timeliness": 0.25,
    "email_engagement": 0.20,
    "login_frequency": 0.15,
    "group_participation": 0.15,
}


async def calculate_member_engagement(db, tenant_id: str, member_id: str) -> dict:
    """Calculate engagement score for a single member.
    
    Returns dict with total_score and factor_breakdown.
    """
    from sqlalchemy import select, func
    from app.modules.members.models import MemberProfile, User, MemberGroupMembership
    from app.modules.finances.models import Invoice
    from app.modules.events.models import EventRegistration
    from app.modules.communications.models import EmailSendingLog

    now = datetime.now(timezone.utc)

    # Get member profile and user
    result = await db.execute(
        select(MemberProfile, User)
        .join(User, MemberProfile.user_id == User.id)
        .where(MemberProfile.id == member_id, MemberProfile.tenant_id == tenant_id)
    )
    row = result.first()
    if not row:
        return {"total_score": 0.0, "factors": {}, "member_id": member_id}

    profile, user = row

    # ── Factor 1: Event Attendance (25%) ──
    event_count_result = await db.execute(
        select(func.count())
        .select_from(EventRegistration)
        .where(
            EventRegistration.member_id == member_id,
            EventRegistration.status.in_(["confirmed", "checked_in"]),
        )
    )
    events_attended = event_count_result.scalar() or 0

    # Also count total events available (in last year)
    year_ago = now - timedelta(days=365)
    total_events_result = await db.execute(
        select(func.count())
        .select_from(EventRegistration)
        .where(
            EventRegistration.member_id == member_id,
            EventRegistration.status.in_(["confirmed", "checked_in"]),
            EventRegistration.registered_at >= year_ago,
        )
    )
    total_events = total_events_result.scalar() or 0

    # Score: attended 5+ events = 1.0, 0 = 0.0
    event_score = min(events_attended / 5.0, 1.0)

    # ── Factor 2: Payment Timeliness (25%) ──
    invoice_result = await db.execute(
        select(Invoice).where(
            Invoice.member_id == member_id,
            Invoice.tenant_id == tenant_id,
        )
    )
    invoices = invoice_result.scalars().all()

    if invoices:
        paid_count = sum(1 for inv in invoices if str(inv.status) == "paid")
        overdue_count = sum(1 for inv in invoices if str(inv.status) == "overdue")
        total = len(invoices)

        # Ratio of paid invoices
        payment_ratio = paid_count / total
        # Penalty for overdue
        overdue_penalty = overdue_count * 0.15
        payment_score = max(0.0, payment_ratio - overdue_penalty)
    else:
        payment_score = 0.5  # No invoices = neutral

    # ── Factor 3: Email Engagement (20%) ──
    # Count emails sent to this member in last 90 days
    ninety_days_ago = now - timedelta(days=90)
    email_result = await db.execute(
        select(func.count())
        .select_from(EmailSendingLog)
        .where(
            EmailSendingLog.recipient_id == user.id,
            EmailSendingLog.created_at >= ninety_days_ago,
        )
    )
    emails_sent = email_result.scalar() or 0

    # More emails sent = more engagement opportunities
    # 10+ emails in 90 days = good engagement
    email_score = min(emails_sent / 10.0, 1.0)

    # ── Factor 4: Login Frequency (15%) ──
    if user.last_login_at:
        days_since_login = (now - user.last_login_at).days
        if days_since_login <= 7:
            login_score = 1.0
        elif days_since_login <= 30:
            login_score = 0.7
        elif days_since_login <= 90:
            login_score = 0.4
        elif days_since_login <= 180:
            login_score = 0.15
        else:
            login_score = 0.0
    else:
        login_score = 0.0

    # ── Factor 5: Group Participation (15%) ──
    groups_result = await db.execute(
        select(func.count())
        .select_from(MemberGroupMembership)
        .where(MemberGroupMembership.member_id == member_id)
    )
    group_count = groups_result.scalar() or 0

    # 3+ groups = full score
    group_score = min(group_count / 3.0, 1.0)

    # ── Weighted Total ──
    factors = {
        "event_attendance": round(event_score, 4),
        "payment_timeliness": round(payment_score, 4),
        "email_engagement": round(email_score, 4),
        "login_frequency": round(login_score, 4),
        "group_participation": round(group_score, 4),
    }

    total_score = (
        factors["event_attendance"] * WEIGHTS["event_attendance"]
        + factors["payment_timeliness"] * WEIGHTS["payment_timeliness"]
        + factors["email_engagement"] * WEIGHTS["email_engagement"]
        + factors["login_frequency"] * WEIGHTS["login_frequency"]
        + factors["group_participation"] * WEIGHTS["group_participation"]
    )

    return {
        "member_id": member_id,
        "total_score": round(total_score, 4),
        "factors": factors,
        "raw_data": {
            "events_attended": events_attended,
            "invoices_total": len(invoices),
            "invoices_paid": sum(1 for inv in invoices if str(inv.status) == "paid"),
            "invoices_overdue": sum(1 for inv in invoices if str(inv.status) == "overdue"),
            "emails_sent_90d": emails_sent,
            "days_since_login": (now - user.last_login_at).days if user.last_login_at else None,
            "groups_joined": group_count,
        },
    }


async def calculate_all_engagement_scores(db, tenant_id: str) -> dict:
    """Calculate engagement scores for all members in a tenant.
    
    Updates MemberProfile.engagement_score for each member.
    Returns summary stats.
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

    scores = []
    updated_count = 0

    for member_id in member_ids:
        engagement = await calculate_member_engagement(db, tenant_id, member_id)
        score = engagement["total_score"]
        scores.append(score)

        # Update the member profile
        profile_result = await db.execute(
            select(MemberProfile).where(MemberProfile.id == member_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.engagement_score = score
            updated_count += 1

    await db.flush()

    # Stats
    if scores:
        import statistics
        stats = {
            "total_members": len(scores),
            "updated": updated_count,
            "mean_score": round(statistics.mean(scores), 4),
            "median_score": round(statistics.median(scores), 4),
            "min_score": round(min(scores), 4),
            "max_score": round(max(scores), 4),
            "std_score": round(statistics.stdev(scores), 4) if len(scores) > 1 else 0.0,
            "distribution": {
                "high (>0.7)": sum(1 for s in scores if s > 0.7),
                "medium (0.3-0.7)": sum(1 for s in scores if 0.3 <= s <= 0.7),
                "low (<0.3)": sum(1 for s in scores if s < 0.3),
            },
        }
    else:
        stats = {"total_members": 0, "updated": 0}

    logger.info("Engagement scores calculated for %d members in %s", updated_count, tenant_id)

    return stats
