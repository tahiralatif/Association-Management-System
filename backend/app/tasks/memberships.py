"""Membership renewal reminder task — checks for expiring memberships daily."""

from celery import shared_task


@shared_task
def check_membership_renewals():
    """Find memberships expiring in 7, 3, and 1 days and send reminders."""
    import asyncio
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.modules.members.models import MemberProfile, User, MembershipStatus

    async def _check():
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            sent = 0

            for daysAhead in [7, 3, 1]:
                target = now + timedelta(days=daysAhead)
                # Find members expiring on that exact day
                start_of_day = target.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = start_of_day + timedelta(days=1)

                result = await db.execute(
                    select(MemberProfile, User)
                    .join(User, User.id == MemberProfile.user_id)
                    .where(
                        MemberProfile.status == MembershipStatus.ACTIVE,
                        MemberProfile.expires_at >= start_of_day,
                        MemberProfile.expires_at < end_of_day,
                        MemberProfile.tenant_id != "",  # skip empty
                    )
                )
                rows = result.all()

                for profile, user in rows:
                    try:
                        from app.core.notifications import notify_membership_renewal
                        expiry_str = profile.expires_at.strftime("%B %d, %Y")
                        notify_membership_renewal(
                            user.email,
                            f"{user.first_name} {user.last_name}",
                            expiry_str,
                            daysAhead,
                        )
                        sent += 1
                    except Exception:
                        continue

            return {"reminders_sent": sent}

    return asyncio.get_event_loop().run_until_complete(_check())
