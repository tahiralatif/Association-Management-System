"""Celery tasks for database backups and ML scoring."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import shared_task

log = logging.getLogger(__name__)


@shared_task(name="app.tasks.backup.daily_backup")
def daily_backup():
    """Run daily database backup with rotation."""
    from app.core.backup import run_backup, cleanup_old_backups

    log.info("Starting daily backup")
    result = run_backup()

    if result["success"]:
        log.info("Daily backup complete: %s (%.2f MB)", result["file"], result["size_mb"])
        # Clean up old backups
        cleanup = cleanup_old_backups()
        log.info("Cleaned up %d old backups", cleanup["removed"])
    else:
        log.error("Daily backup failed: %s", result.get("error"))

    return result


@shared_task(name="app.tasks.ml.calculate_engagement_scores")
def calculate_engagement_scores():
    """Recalculate engagement scores for all members."""
    import asyncio
    from app.core.database import async_session_factory

    async def _run():
        from sqlalchemy import select, func
        from app.modules.members.models import MemberProfile, User
        from app.modules.finances.models import Invoice
        from app.modules.events.models import EventRegistration
        from app.modules.communications.models import EmailSendingLog

        async with async_session_factory() as db:
            # Get all active member profiles
            result = await db.execute(
                select(MemberProfile, User)
                .join(User, MemberProfile.user_id == User.id)
                .where(User.is_active == True)
            )
            members = result.all()

            now = datetime.now(timezone.utc)
            updated = 0

            for profile, user in members:
                score = 0.0

                # 1. Event attendance (25%)
                event_count = await db.execute(
                    select(func.count())
                    .select_from(EventRegistration)
                    .where(
                        EventRegistration.member_id == profile.id,
                        EventRegistration.status == "attended",
                    )
                )
                events = event_count.scalar() or 0
                score += min(events / 10, 1.0) * 0.25

                # 2. Payment timeliness (25%)
                if profile.tenant_id:
                    inv_result = await db.execute(
                        select(Invoice).where(
                            Invoice.member_id == profile.id,
                            Invoice.tenant_id == profile.tenant_id,
                        )
                    )
                    invoices = inv_result.scalars().all()
                    if invoices:
                        paid_on_time = sum(
                            1 for inv in invoices
                            if str(inv.status) == "paid"
                        )
                        score += (paid_on_time / len(invoices)) * 0.25

                # 3. Login frequency (20%)
                if user.last_login_at:
                    days_since = (now - user.last_login_at).days
                    if days_since <= 7:
                        score += 0.20
                    elif days_since <= 30:
                        score += 0.15
                    elif days_since <= 90:
                        score += 0.10
                    elif days_since <= 180:
                        score += 0.05

                # 4. Email engagement (15%)
                email_count = await db.execute(
                    select(func.count())
                    .select_from(EmailSendingLog)
                    .where(EmailSendingLog.recipient_id == profile.id)
                )
                emails = email_count.scalar() or 0
                score += min(emails / 20, 1.0) * 0.15

                # 5. Membership tenure (15%)
                tenure_days = (now - profile.joined_at).days if profile.joined_at else 0
                score += min(tenure_days / 365, 1.0) * 0.15

                # Clamp and update
                score = round(min(1.0, max(0.0, score)), 4)
                profile.engagement_score = score
                updated += 1

            await db.commit()
            log.info("Updated engagement scores for %d members", updated)
            return updated

    return asyncio.get_event_loop().run_until_complete(_run())


@shared_task(name="app.tasks.ml.batch_churn_predictions")
def batch_churn_predictions():
    """Run churn predictions for all active members."""
    import asyncio
    from app.core.database import async_session_factory

    async def _run():
        from sqlalchemy import select
        from app.modules.members.models import MemberProfile, User
        from app.modules.ai.services import ChurnPredictor

        async with async_session_factory() as db:
            result = await db.execute(
                select(MemberProfile.id, MemberProfile.tenant_id)
                .join(User, MemberProfile.user_id == User.id)
                .where(User.is_active == True)
            )
            members = result.all()

            updated = 0
            for member_id, tenant_id in members:
                try:
                    prediction = await ChurnPredictor.predict_churn_risk(
                        db, tenant_id, member_id
                    )
                    # Update member's churn_risk field
                    profile_result = await db.execute(
                        select(MemberProfile).where(MemberProfile.id == member_id)
                    )
                    profile = profile_result.scalar_one_or_none()
                    if profile:
                        profile.churn_risk = prediction.risk_score
                        updated += 1
                except Exception as e:
                    log.warning("Churn prediction failed for %s: %s", member_id, e)

            await db.commit()
            log.info("Batch churn predictions complete: %d members scored", updated)
            return updated

    return asyncio.get_event_loop().run_until_complete(_run())
