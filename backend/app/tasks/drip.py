"""Drip campaign processing tasks.

Celery tasks that process drip campaign enrollments:
- Process pending emails (runs every 5 minutes)
- Enroll new members based on triggers (runs every hour)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from celery import shared_task
from sqlalchemy import select

from app.core.database import async_session_factory

logger = logging.getLogger(__name__)


def process_pending_drips():
    """Process all drip campaign enrollments that are due.

    Runs every 5 minutes via Celery beat.
    """
    return asyncio.run(_process_pending_drips())


async def _process_pending_drips() -> dict:
    """Async implementation of drip processing."""
    from app.modules.communications.models import (
        DripEnrollment, DripStep, DripCampaign,
        DripEnrollmentStatus, DripCampaignStatus, DripStepType,
        DripLog, EmailSendingLog,
    )

    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)

        # Get active enrollments due for processing
        result = await db.execute(
            select(DripEnrollment).where(
                DripEnrollment.status == DripEnrollmentStatus.ACTIVE,
                DripEnrollment.next_send_at <= now,
            ).limit(100)
        )
        enrollments = result.scalars().all()

        if not enrollments:
            return {"processed": 0, "message": "No enrollments due"}

        processed = 0
        for enrollment in enrollments:
            try:
                # Get campaign
                campaign = await db.get(DripCampaign, enrollment.campaign_id)
                if not campaign or campaign.status != DripCampaignStatus.ACTIVE:
                    continue

                # Get current step
                current_step = None
                if enrollment.current_step_order > 0:
                    step_result = await db.execute(
                        select(DripStep).where(
                            DripStep.campaign_id == enrollment.campaign_id,
                            DripStep.step_order == enrollment.current_step_order,
                        )
                    )
                    current_step = step_result.scalar_one_or_none()

                if current_step is None:
                    # First step — get step_order=1
                    step_result = await db.execute(
                        select(DripStep).where(
                            DripStep.campaign_id == enrollment.campaign_id,
                        ).order_by(DripStep.step_order).limit(1)
                    )
                    current_step = step_result.scalar_one_or_none()
                    if current_step is None:
                        continue

                # Process based on step type
                if current_step.step_type == DripStepType.EMAIL:
                    # Send email (log it)
                    log_entry = DripLog(
                        tenant_id=enrollment.tenant_id,
                        enrollment_id=enrollment.id,
                        step_id=current_step.id,
                        campaign_id=enrollment.campaign_id,
                        member_id=enrollment.member_id,
                        action="sent",
                    )
                    db.add(log_entry)
                    current_step.sent_count += 1

                elif current_step.step_type == DripStepType.WAIT:
                    log_entry = DripLog(
                        tenant_id=enrollment.tenant_id,
                        enrollment_id=enrollment.id,
                        step_id=current_step.id,
                        campaign_id=enrollment.campaign_id,
                        member_id=enrollment.member_id,
                        action="skipped",
                    )
                    db.add(log_entry)

                elif current_step.step_type == DripStepType.CONDITION:
                    condition_met = await _evaluate_condition(db, current_step, enrollment)
                    action = "condition_true" if condition_met else "condition_false"
                    log_entry = DripLog(
                        tenant_id=enrollment.tenant_id,
                        enrollment_id=enrollment.id,
                        step_id=current_step.id,
                        campaign_id=enrollment.campaign_id,
                        member_id=enrollment.member_id,
                        action=action,
                    )
                    db.add(log_entry)

                # Advance enrollment
                await _advance_enrollment(db, enrollment, current_step)
                processed += 1

            except Exception as e:
                logger.error(f"Error processing enrollment {enrollment.id}: {e}")
                continue

        await db.commit()
        return {"processed": processed, "total": len(enrollments)}


def enroll_trigger_members():
    """Enroll members in drip campaigns based on trigger events.

    Runs every hour via Celery beat.
    """
    return asyncio.run(_enroll_trigger_members())


async def _enroll_trigger_members() -> dict:
    """Async implementation of trigger enrollment."""
    from app.modules.communications.models import (
        DripCampaign, DripEnrollment, DripCampaignStatus, DripEnrollmentStatus,
    )
    from app.modules.members.models import MemberProfile, MemberStatus

    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)

        # Get active campaigns with triggers
        result = await db.execute(
            select(DripCampaign).where(
                DripCampaign.status == DripCampaignStatus.ACTIVE,
                DripCampaign.trigger_event != "manual",
            )
        )
        campaigns = result.scalars().all()

        enrolled_count = 0
        for campaign in campaigns:
            # Get eligible members based on trigger
            eligible_ids = await _get_eligible_members(db, campaign)
            if not eligible_ids:
                continue

            # Filter out already enrolled
            existing = await db.execute(
                select(DripEnrollment.member_id).where(
                    DripEnrollment.campaign_id == campaign.id,
                    DripEnrollment.member_id.in_(eligible_ids),
                )
            )
            already_enrolled = {row[0] for row in existing.all()}
            new_ids = [mid for mid in eligible_ids if mid not in already_enrolled]

            for member_id in new_ids:
                enrollment = DripEnrollment(
                    tenant_id=campaign.tenant_id,
                    campaign_id=campaign.id,
                    member_id=member_id,
                    current_step_order=0,
                    status=DripEnrollmentStatus.ACTIVE,
                    next_send_at=now,  # Process immediately
                )
                db.add(enrollment)
                campaign.total_enrolled += 1
                enrolled_count += 1

        await db.commit()
        return {"enrolled": enrolled_count, "campaigns_checked": len(campaigns)}


async def _evaluate_condition(db, step, enrollment):
    """Evaluate a condition step."""
    from app.modules.members.models import MemberProfile

    member = await db.get(MemberProfile, enrollment.member_id)
    if not member:
        return False

    if step.condition_type == "is_active":
        return str(member.status) == "active" if member.status else False
    elif step.condition_type == "has_paid":
        return member.paid_through is not None and member.paid_through > datetime.now(timezone.utc)
    elif step.condition_type == "opened_previous":
        return False  # TODO: implement open tracking check
    elif step.condition_type == "clicked_previous":
        return False  # TODO: implement click tracking check

    return False


async def _advance_enrollment(db, enrollment, completed_step):
    """Advance enrollment to next step or complete it."""
    from app.modules.communications.models import DripStep

    # Find next step
    result = await db.execute(
        select(DripStep).where(
            DripStep.campaign_id == enrollment.campaign_id,
            DripStep.step_order > completed_step.step_order,
        ).order_by(DripStep.step_order).limit(1)
    )
    next_step = result.scalar_one_or_none()

    if next_step is None:
        # Campaign complete
        enrollment.status = DripEnrollmentStatus.COMPLETED
        enrollment.completed_at = datetime.now(timezone.utc)
        enrollment.next_send_at = None
    else:
        enrollment.current_step_order = next_step.step_order
        delay = timedelta(days=next_step.delay_days, hours=next_step.delay_hours)
        enrollment.next_send_at = datetime.now(timezone.utc) + delay


async def _get_eligible_members(db, campaign):
    """Get member IDs eligible for a campaign based on trigger event."""
    from app.modules.members.models import MemberProfile, MemberStatus

    q = select(MemberProfile.user_id).where(
        MemberProfile.tenant_id == campaign.tenant_id,
        MemberProfile.status == MemberStatus.ACTIVE,
    )

    # Apply segment filtering
    if campaign.target_segments:
        pass  # TODO: implement segment filtering

    if campaign.target_group_ids:
        pass  # TODO: implement group filtering

    if not campaign.target_all and not campaign.target_segments and not campaign.target_group_ids:
        return []

    result = await db.execute(q.limit(1000))
    return [row[0] for row in result.all()]
