"""Membership lifecycle tasks — renewal reminders, auto-renew, lapse marking.

Runs daily via Celery beat. Checks for expiring memberships and processes
auto-renewals for members with stored payment methods.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_factory
from app.modules.members.models import MemberProfile, User, MemberStatus

log = logging.getLogger(__name__)


@shared_task(name="app.tasks.memberships.check_membership_renewals")
def check_membership_renewals():
    """Find memberships expiring in 7, 3, and 1 days and send reminders.

    Runs daily at 8 AM UTC via Celery beat.
    """
    return asyncio.run(_check_renewals())


async def _check_renewals() -> dict:
    """Async implementation of renewal check."""
    from app.core.notifications import notify_membership_renewal

    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        sent = 0

        for days_ahead in [7, 3, 1]:
            target = now + timedelta(days=days_ahead)
            start_of_day = target.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)

            result = await db.execute(
                select(MemberProfile, User)
                .join(User, User.id == MemberProfile.user_id)
                .where(
                    MemberProfile.status == MemberStatus.ACTIVE,
                    MemberProfile.expires_at >= start_of_day,
                    MemberProfile.expires_at < end_of_day,
                    MemberProfile.tenant_id != "",
                )
            )
            rows = result.all()

            for profile, user in rows:
                try:
                    expiry_str = profile.expires_at.strftime("%B %d, %Y")
                    notify_membership_renewal(
                        user.email,
                        f"{user.first_name} {user.last_name}",
                        expiry_str,
                        days_ahead,
                        profile.tier.value if profile.tier else "Member",
                        profile.tenant_id,
                    )
                    sent += 1
                    log.info("Sent %d-day renewal reminder to %s", days_ahead, user.email)
                except Exception:
                    log.exception("Failed to send renewal reminder to %s", user.email)

        return {"reminders_sent": sent}


@shared_task(name="app.tasks.memberships.process_auto_renewals")
def process_auto_renewals():
    """Process auto-renewals for members with auto_renew=True.

    Charges stored payment methods via Stripe and extends membership.
    Runs daily at 9 AM UTC via Celery beat.
    """
    return asyncio.run(_process_renewals())


async def _process_renewals() -> dict:
    """Async implementation of auto-renewal processing."""
    from app.core.notifications import notify_membership_renewal

    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        renewed = 0
        failed = 0

        # Find active members with auto_renew enabled whose membership expires within 3 days
        expiry_cutoff = now + timedelta(days=3)

        result = await db.execute(
            select(MemberProfile, User)
            .join(User, User.id == MemberProfile.user_id)
            .where(
                MemberProfile.status == MemberStatus.ACTIVE,
                MemberProfile.auto_renew == True,  # noqa: E712
                MemberProfile.expires_at <= expiry_cutoff,
                MemberProfile.expires_at > now,  # not already expired
                MemberProfile.tenant_id != "",
            )
        )
        rows = result.all()

        for profile, user in rows:
            try:
                # Attempt to charge via Stripe (using stored payment method)
                from app.modules.finances.crud import charge_auto_renewal
                success = await charge_auto_renewal(profile, user)

                if success:
                    # Extend membership by 1 year
                    profile.expires_at = profile.expires_at + timedelta(days=365)
                    profile.renewal_date = now
                    await db.commit()
                    renewed += 1
                    log.info("Auto-renewed membership for %s", user.email)
                else:
                    failed += 1
                    log.warning("Auto-renewal payment failed for %s", user.email)
            except Exception:
                failed += 1
                log.exception("Error processing auto-renewal for %s", user.email)

        return {"renewed": renewed, "failed": failed}


@shared_task(name="app.tasks.memberships.mark_lapsed_memberships")
def mark_lapsed_memberships():
    """Mark expired active memberships as lapsed.

    Runs daily at 10 AM UTC via Celery beat.
    """
    return asyncio.run(_mark_lapsed())


async def _mark_lapsed() -> dict:
    """Async implementation of lapse marking."""
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)

        result = await db.execute(
            select(MemberProfile)
            .where(
                MemberProfile.status == MemberStatus.ACTIVE,
                MemberProfile.expires_at < now,
                MemberProfile.tenant_id != "",
            )
        )
        profiles = result.scalars().all()

        count = 0
        for profile in profiles:
            profile.status = MemberStatus.LAPSED
            count += 1
            log.info("Marked member %s as lapsed (expired %s)", profile.id, profile.expires_at)

        if count > 0:
            await db.commit()

        return {"members_lapsed": count}
