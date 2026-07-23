"""Communications CRUD."""

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.communications.models import (
    Announcement,
    AnnouncementStatus,
    CampaignStatus,
    EmailCampaign,
    EmailTemplate,
    MessageLog,
    Notification,
    Survey,
    SurveyResponse,
    SurveyStatus,
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:300]


# ── Email Campaigns ──────────────────────────────────────────

async def create_campaign(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> EmailCampaign:
    campaign = EmailCampaign(tenant_id=tenant_id, created_by=creator_id, **data)
    db.add(campaign)
    await db.flush()
    return campaign


async def list_campaigns(
    db: AsyncSession, tenant_id: str, status: str | None = None, page: int = 1, per_page: int = 20
) -> tuple[list[EmailCampaign], int]:
    query = select(EmailCampaign).where(EmailCampaign.tenant_id == tenant_id)
    if status:
        query = query.where(EmailCampaign.status == status)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(EmailCampaign.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


async def get_campaign(db: AsyncSession, campaign_id: str, tenant_id: str) -> EmailCampaign | None:
    result = await db.execute(
        select(EmailCampaign).where(EmailCampaign.id == campaign_id, EmailCampaign.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def send_campaign(db: AsyncSession, campaign_id: str, tenant_id: str) -> EmailCampaign | None:
    """Mark campaign as sent."""
    campaign = await get_campaign(db, campaign_id, tenant_id)
    if not campaign or campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.SCHEDULED):
        return None
    campaign.status = CampaignStatus.SENT
    campaign.sent_at = datetime.now(timezone.utc)
    await db.flush()
    return campaign


# ── Announcements ────────────────────────────────────────────

async def create_announcement(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Announcement:
    announcement = Announcement(
        tenant_id=tenant_id,
        created_by=creator_id,
        slug=slugify(data.get("title", "")),
        **data,
    )
    db.add(announcement)
    await db.flush()
    return announcement


async def list_announcements(
    db: AsyncSession, tenant_id: str, status: str | None = None, page: int = 1, per_page: int = 20
) -> tuple[list[Announcement], int]:
    query = select(Announcement).where(Announcement.tenant_id == tenant_id)
    if status:
        query = query.where(Announcement.status == status)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


async def get_announcement(db: AsyncSession, announcement_id: str, tenant_id: str) -> Announcement | None:
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id, Announcement.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def publish_announcement(db: AsyncSession, announcement_id: str, tenant_id: str) -> Announcement | None:
    ann = await get_announcement(db, announcement_id, tenant_id)
    if not ann:
        return None
    ann.status = AnnouncementStatus.PUBLISHED
    ann.published_at = datetime.now(timezone.utc)
    await db.flush()
    return ann


# ── Surveys ──────────────────────────────────────────────────

async def create_survey(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Survey:
    survey = Survey(tenant_id=tenant_id, created_by=creator_id, **data)
    db.add(survey)
    await db.flush()
    return survey


async def list_surveys(
    db: AsyncSession, tenant_id: str, status: str | None = None, page: int = 1, per_page: int = 20
) -> tuple[list[Survey], int]:
    query = select(Survey).where(Survey.tenant_id == tenant_id)
    if status:
        query = query.where(Survey.status == status)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Survey.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all()), count


async def get_survey(db: AsyncSession, survey_id: str, tenant_id: str) -> Survey | None:
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id, Survey.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def submit_survey_response(
    db: AsyncSession, survey_id: str, respondent_id: str | None, answers: list[dict]
) -> SurveyResponse:
    response = SurveyResponse(
        survey_id=survey_id,
        respondent_id=respondent_id,
        answers=answers,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(response)

    # Update response count
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if survey:
        survey.response_count += 1

    await db.flush()
    return response


# ── Notifications ────────────────────────────────────────────

async def create_notification(db: AsyncSession, tenant_id: str, data: dict) -> Notification:
    notif = Notification(tenant_id=tenant_id, **data)
    db.add(notif)
    await db.flush()
    return notif


async def list_notifications(
    db: AsyncSession, tenant_id: str, user_id: str, unread_only: bool = False, limit: int = 50
) -> list[Notification]:
    query = select(Notification).where(
        Notification.tenant_id == tenant_id,
        Notification.user_id == user_id,
    )
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def mark_notification_read(db: AsyncSession, notification_id: str, user_id: str) -> bool:
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        return False
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.flush()
    return True


async def mark_all_read(db: AsyncSession, tenant_id: str, user_id: str) -> int:
    result = await db.execute(
        select(Notification).where(
            Notification.tenant_id == tenant_id,
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
    )
    notifs = result.scalars().all()
    for n in notifs:
        n.is_read = True
        n.read_at = datetime.now(timezone.utc)
    await db.flush()
    return len(notifs)


# ── Email Templates ──────────────────────────────────────────

async def create_template(db: AsyncSession, tenant_id: str, data: dict) -> EmailTemplate:
    template = EmailTemplate(tenant_id=tenant_id, **data)
    db.add(template)
    await db.flush()
    return template


async def list_templates(db: AsyncSession, tenant_id: str) -> list[EmailTemplate]:
    result = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.tenant_id == tenant_id, EmailTemplate.is_active == True)
        .order_by(EmailTemplate.name)
    )
    return list(result.scalars().all())


# ── Message Log ──────────────────────────────────────────────

async def log_message(db: AsyncSession, tenant_id: str, data: dict) -> MessageLog:
    log = MessageLog(tenant_id=tenant_id, **data)
    db.add(log)
    await db.flush()
    return log


async def get_message_logs(
    db: AsyncSession, tenant_id: str, campaign_id: str | None = None, limit: int = 100
) -> list[MessageLog]:
    query = select(MessageLog).where(MessageLog.tenant_id == tenant_id)
    if campaign_id:
        query = query.where(MessageLog.campaign_id == campaign_id)
    query = query.order_by(MessageLog.sent_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Summary ──────────────────────────────────────────────────

async def get_communications_summary(db: AsyncSession, tenant_id: str) -> dict:
    # Campaign stats
    campaigns = await db.execute(
        select(func.count()).select_from(EmailCampaign).where(EmailCampaign.tenant_id == tenant_id)
    )
    total_campaigns = campaigns.scalar() or 0

    sent = await db.execute(
        select(func.coalesce(func.sum(EmailCampaign.sent_count), 0))
        .where(EmailCampaign.tenant_id == tenant_id)
    )
    total_sent = float(sent.scalar())

    # Open/click rates
    stats = await db.execute(
        select(
            func.coalesce(func.avg(
                func.nullif(EmailCampaign.opened_count, 0) * 100.0 / func.nullif(EmailCampaign.sent_count, 0)
            ), 0),
            func.coalesce(func.avg(
                func.nullif(EmailCampaign.clicked_count, 0) * 100.0 / func.nullif(EmailCampaign.sent_count, 0)
            ), 0),
        ).where(EmailCampaign.tenant_id == tenant_id, EmailCampaign.status == CampaignStatus.SENT)
    )
    row = stats.one()
    avg_open = float(row[0])
    avg_click = float(row[1])

    # Active announcements
    ann_count = await db.execute(
        select(func.count())
        .select_from(Announcement)
        .where(Announcement.tenant_id == tenant_id, Announcement.status == AnnouncementStatus.PUBLISHED)
    )
    active_ann = ann_count.scalar() or 0

    # Active surveys
    sur_count = await db.execute(
        select(func.count())
        .select_from(Survey)
        .where(Survey.tenant_id == tenant_id, Survey.status == SurveyStatus.ACTIVE)
    )
    active_surveys = sur_count.scalar() or 0

    # Unread notifications (aggregate)
    unread = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.tenant_id == tenant_id, Notification.is_read == False)
    )
    unread_count = unread.scalar() or 0

    return {
        "total_campaigns": total_campaigns,
        "total_emails_sent": int(total_sent),
        "average_open_rate": round(avg_open, 1),
        "average_click_rate": round(avg_click, 1),
        "active_announcements": active_ann,
        "active_surveys": active_surveys,
        "unread_notifications": unread_count,
        "recent_messages": [],
        "channel_breakdown": {"email": int(total_sent), "sms": 0, "push": 0},
    }
