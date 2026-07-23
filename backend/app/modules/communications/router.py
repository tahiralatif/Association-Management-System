"""Communications routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin, require_staff, TokenPayload
from app.core.database import get_db
from app.modules.communications import crud
from app.modules.communications.schemas import (
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementUpdate,
    CommunicationsSummary,
    EmailCampaignCreate,
    EmailCampaignResponse,
    EmailCampaignUpdate,
    EmailTemplateCreate,
    EmailTemplateResponse,
    NotificationCreate,
    NotificationResponse,
    SurveyCreate,
    SurveyResponseSchema,
    SurveySubmit,
)

router = APIRouter()


# ── Email Campaigns ──────────────────────────────────────────

@router.get("/campaigns")
async def list_campaigns(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    campaigns, total = await crud.list_campaigns(db, user.tenant_id, status=status_filter, page=page, per_page=per_page)
    return {
        "items": [EmailCampaignResponse.model_validate(c) for c in campaigns],
        "total": total,
    }


@router.get("/campaigns/{campaign_id}", response_model=EmailCampaignResponse)
async def get_campaign(
    campaign_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    campaign = await crud.get_campaign(db, campaign_id, user.tenant_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    resp = EmailCampaignResponse.model_validate(campaign)
    if campaign.sent_count:
        resp.open_rate = round(campaign.opened_count / campaign.sent_count * 100, 1)
        resp.click_rate = round(campaign.clicked_count / campaign.sent_count * 100, 1)
    return resp


@router.post("/campaigns", response_model=EmailCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: EmailCampaignCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    campaign = await crud.create_campaign(db, user.tenant_id, user.sub, data.model_dump())
    return EmailCampaignResponse.model_validate(campaign)


@router.patch("/campaigns/{campaign_id}", response_model=EmailCampaignResponse)
async def update_campaign(
    campaign_id: str,
    data: EmailCampaignUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    campaign = await crud.get_campaign(db, campaign_id, user.tenant_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(campaign, key, value)
    await db.flush()
    return EmailCampaignResponse.model_validate(campaign)


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send campaign — dispatches email batch via Celery."""
    campaign = await crud.send_campaign(db, campaign_id, user.tenant_id)
    if not campaign:
        raise HTTPException(status_code=400, detail="Campaign cannot be sent")

    # Dispatch Celery task for async email sending
    try:
        from app.tasks.email import send_bulk_emails_task
        # Build email list from campaign targets
        from sqlalchemy import select
        from app.modules.members.models import MemberProfile
        from app.modules.auth.models import User

        query = select(User.email, User.full_name, MemberProfile.id.label("member_id")).join(
            MemberProfile, User.id == MemberProfile.user_id
        ).where(MemberProfile.tenant_id == user.tenant_id)
        result = await db.execute(query)
        members = result.all()

        emails = [
            {
                "to": m.email,
                "subject": campaign.subject,
                "html_body": campaign.html_body.replace("{{name}}", m.full_name or "Member"),
            }
            for m in members
            if m.email
        ]
        if emails:
            send_bulk_emails_task.delay(emails, tenant_id=user.tenant_id)
    except Exception:
        pass  # Celery may not be running; campaign is still marked as sending

    from app.core.audit import log_audit_event
    await log_audit_event(db, user.tenant_id, user.sub, "send", "campaign", campaign_id,
                          {"name": campaign.name})

    return {"message": "Campaign sending started", "campaign_id": campaign_id}


@router.post("/campaigns/{campaign_id}/duplicate")
async def duplicate_campaign(
    campaign_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate an existing campaign as a draft."""
    original = await crud.get_campaign(db, campaign_id, user.tenant_id)
    if not original:
        raise HTTPException(status_code=404, detail="Campaign not found")

    data = {
        "name": f"{original.name} (Copy)",
        "subject": original.subject,
        "preview_text": original.preview_text,
        "html_body": original.html_body,
        "plain_body": original.plain_body,
        "target_segments": original.target_segments,
        "target_group_ids": original.target_group_ids,
        "target_all": original.target_all,
        "from_name": original.from_name,
        "from_email": original.from_email,
        "reply_to": original.reply_to,
    }
    campaign = await crud.create_campaign(db, user.tenant_id, user.sub, data)
    return {"id": campaign.id, "name": campaign.name}


# ── Announcements ────────────────────────────────────────────

@router.get("/announcements")
async def list_announcements(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_announcements(db, user.tenant_id, status=status_filter, page=page, per_page=per_page)
    return {
        "items": [AnnouncementResponse.model_validate(a) for a in items],
        "total": total,
    }


@router.get("/announcements/{ann_id}", response_model=AnnouncementResponse)
async def get_announcement(
    ann_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    ann = await crud.get_announcement(db, ann_id, user.tenant_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    # Increment view count
    ann.view_count += 1
    await db.flush()
    return AnnouncementResponse.model_validate(ann)


@router.post("/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ann = await crud.create_announcement(db, user.tenant_id, user.sub, data.model_dump())
    return AnnouncementResponse.model_validate(ann)


@router.patch("/announcements/{ann_id}", response_model=AnnouncementResponse)
async def update_announcement(
    ann_id: str,
    data: AnnouncementUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ann = await crud.get_announcement(db, ann_id, user.tenant_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(ann, key, value)
    await db.flush()
    return AnnouncementResponse.model_validate(ann)


@router.post("/announcements/{ann_id}/publish")
async def publish_announcement(
    ann_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ann = await crud.publish_announcement(db, ann_id, user.tenant_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement published"}


# ── Surveys ──────────────────────────────────────────────────

@router.get("/surveys")
async def list_surveys(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_surveys(db, user.tenant_id, status=status_filter, page=page, per_page=per_page)
    return {
        "items": [SurveyResponseSchema.model_validate(s) for s in items],
        "total": total,
    }


@router.get("/surveys/{survey_id}", response_model=SurveyResponseSchema)
async def get_survey(
    survey_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    survey = await crud.get_survey(db, survey_id, user.tenant_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    resp = SurveyResponseSchema.model_validate(survey)
    if survey.total_invited:
        resp.response_rate = round(survey.response_count / survey.total_invited * 100, 1)
    return resp


@router.post("/surveys", response_model=SurveyResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_survey(
    data: SurveyCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    survey = await crud.create_survey(db, user.tenant_id, user.sub, data.model_dump())
    return SurveyResponseSchema.model_validate(survey)


@router.post("/surveys/{survey_id}/submit")
async def submit_survey(
    survey_id: str,
    data: SurveySubmit,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    survey = await crud.get_survey(db, survey_id, user.tenant_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    answers = [{"question_index": a.question_index, "answer": a.answer} for a in data.answers]
    await crud.submit_survey_response(
        db, survey_id, user.sub if not survey.is_anonymous else None, answers
    )
    return {"message": "Response submitted"}


# ── Notifications ────────────────────────────────────────────

@router.get("/notifications")
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notifs = await crud.list_notifications(db, user.tenant_id, user.sub, unread_only=unread_only, limit=limit)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.post("/notifications/send", status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: NotificationCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    notif = await crud.create_notification(db, user.tenant_id, data.model_dump())
    return NotificationResponse.model_validate(notif)


@router.patch("/notifications/{notif_id}/read")
async def mark_read(
    notif_id: str,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ok = await crud.mark_notification_read(db, notif_id, user.sub)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await crud.mark_all_read(db, user.tenant_id, user.sub)
    return {"message": f"Marked {count} notifications as read"}


# ── Templates ────────────────────────────────────────────────

@router.get("/templates")
async def list_templates(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    templates = await crud.list_templates(db, user.tenant_id)
    return [EmailTemplateResponse.model_validate(t) for t in templates]


@router.post("/templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: EmailTemplateCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    template = await crud.create_template(db, user.tenant_id, data.model_dump())
    return EmailTemplateResponse.model_validate(template)


# ── Dashboard ────────────────────────────────────────────────

@router.get("/dashboard", response_model=CommunicationsSummary)
async def get_dashboard(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    summary = await crud.get_communications_summary(db, user.tenant_id)
    return CommunicationsSummary(**summary)


# ── Email Sending Logs (Admin) ─────────────────────────────


@router.get("/email-logs")
async def list_email_logs(
    status_filter: str | None = Query(None, alias="status"),
    campaign_id: str | None = Query(None),
    recipient_email: str | None = Query(None),
    provider: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List email sending logs with filters. Admin view of email history."""
    from sqlalchemy import func, select
    from app.modules.communications.models import EmailSendingLog

    query = select(EmailSendingLog).where(EmailSendingLog.tenant_id == user.tenant_id)

    if status_filter:
        query = query.where(EmailSendingLog.status == status_filter)
    if campaign_id:
        query = query.where(EmailSendingLog.campaign_id == campaign_id)
    if recipient_email:
        query = query.where(EmailSendingLog.recipient_email.ilike(f"%{recipient_email}%"))
    if provider:
        query = query.where(EmailSendingLog.provider == provider)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(EmailSendingLog.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [
            {
                "id": log.id,
                "recipient_email": log.recipient_email,
                "subject": log.subject,
                "status": log.status,
                "provider": log.provider,
                "error_message": log.error_message,
                "template_id": log.template_id,
                "campaign_id": log.campaign_id,
                "retry_count": log.retry_count,
                "sent_at": log.sent_at.isoformat() if log.sent_at else None,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/email-logs/stats")
async def get_email_log_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Get email sending statistics for the admin dashboard."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import func, select
    from app.modules.communications.models import EmailSendingLog

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    base = select(EmailSendingLog).where(
        EmailSendingLog.tenant_id == user.tenant_id,
        EmailSendingLog.created_at >= thirty_days_ago,
    )

    # Total sent
    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar() or 0

    # Successful
    sent = (await db.execute(
        select(func.count()).select_from(
            base.where(EmailSendingLog.status == "sent").subquery()
        )
    )).scalar() or 0

    # Failed
    failed = (await db.execute(
        select(func.count()).select_from(
            base.where(EmailSendingLog.status == "failed").subquery()
        )
    )).scalar() or 0

    # By provider
    provider_stats = await db.execute(
        select(EmailSendingLog.provider, func.count())
        .where(
            EmailSendingLog.tenant_id == user.tenant_id,
            EmailSendingLog.created_at >= thirty_days_ago,
        )
        .group_by(EmailSendingLog.provider)
    )
    providers = {row[0]: row[1] for row in provider_stats.all()}

    # By template
    template_stats = await db.execute(
        select(EmailSendingLog.template_id, func.count())
        .where(
            EmailSendingLog.tenant_id == user.tenant_id,
            EmailSendingLog.created_at >= thirty_days_ago,
            EmailSendingLog.template_id.isnot(None),
        )
        .group_by(EmailSendingLog.template_id)
    )
    templates = {str(row[0]): row[1] for row in template_stats.all()}

    return {
        "period": "30d",
        "total": total,
        "sent": sent,
        "failed": failed,
        "success_rate": round((sent / total * 100) if total > 0 else 0, 1),
        "by_provider": providers,
        "by_template": templates,
    }


@router.get("/email-logs/{log_id}")
async def get_email_log(
    log_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific email send log entry."""
    from sqlalchemy import select
    from app.modules.communications.models import EmailSendingLog

    result = await db.execute(
        select(EmailSendingLog).where(
            EmailSendingLog.id == log_id,
            EmailSendingLog.tenant_id == user.tenant_id,
        )
    )
    log_entry = result.scalar_one_or_none()

    if not log_entry:
        raise HTTPException(status_code=404, detail="Email log not found")

    return {
        "id": log_entry.id,
        "recipient_email": log_entry.recipient_email,
        "recipient_id": log_entry.recipient_id,
        "subject": log_entry.subject,
        "body_preview": log_entry.body_preview,
        "status": log_entry.status,
        "provider": log_entry.provider,
        "error_message": log_entry.error_message,
        "template_id": log_entry.template_id,
        "campaign_id": log_entry.campaign_id,
        "retry_count": log_entry.retry_count,
        "max_retries": log_entry.max_retries,
        "sent_at": log_entry.sent_at.isoformat() if log_entry.sent_at else None,
        "created_at": log_entry.created_at.isoformat() if log_entry.created_at else None,
    }
