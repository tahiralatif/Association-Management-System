"""Events routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin, require_staff, TokenPayload
from app.core.database import get_db
from app.modules.events import crud
from app.modules.events.models import EventRegistration
from app.modules.events.schemas import (
    CheckInRequest,
    EventCreate,
    EventDetailResponse,
    EventResponse,
    EventStats,
    EventUpdate,
    FeedbackCreate,
    FeedbackResponse,
    RegistrationCreate,
    RegistrationResponse,
    SessionCreate,
    SessionResponse,
    SpeakerCreate,
    SpeakerResponse,
    SponsorResponse,
    TicketCreate,
    TicketResponse,
)

router = APIRouter()


# ── Events ───────────────────────────────────────────────────

@router.get("/")
async def list_events(
    status_filter: str | None = Query(None, alias="status"),
    event_type: str | None = Query(None),
    upcoming: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_events(
        db, user.tenant_id, status=status_filter, event_type=event_type,
        upcoming_only=upcoming, page=page, per_page=per_page,
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/stats", response_model=EventStats)
async def get_event_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stats = await crud.get_event_stats(db, user.tenant_id)
    return EventStats(**stats)


@router.get("/{event_id}")
async def get_event(
    event_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.get_event(db, event_id, user.tenant_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.view_count += 1
    await db.flush()

    reg_count = len([r for r in event.registrations if r.status.value != "cancelled"])
    sessions = [SessionResponse(
        id=s.id, title=s.title, description=s.description,
        session_type=str(s.session_type), start_time=s.start_time,
        end_time=s.end_time, room=s.room, track=s.track,
    ) for s in event.sessions]
    speakers = [SpeakerResponse(
        id=s.id, name=s.name, title=s.title, company=s.company,
        bio=s.bio, avatar_url=s.avatar_url, is_keynote=s.is_keynote,
    ) for s in event.speakers]
    tickets = [TicketResponse.model_validate(t) for t in event.tickets]
    sponsors = [SponsorResponse.model_validate(s) for s in event.sponsors]

    return EventDetailResponse(
        **{c.key: getattr(event, c.key) for c in event.__table__.columns},
        registration_count=reg_count,
        sessions=sessions, speakers=speakers, tickets=tickets, sponsors=sponsors,
    )


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.create_event(db, user.tenant_id, user.sub, data.model_dump())
    return EventResponse(**{c.key: getattr(event, c.key) for c in event.__table__.columns})


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    data: EventUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.get_event(db, event_id, user.tenant_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(event, key, value)
    await db.flush()
    return EventResponse(**{c.key: getattr(event, c.key) for c in event.__table__.columns})


@router.post("/{event_id}/publish")
async def publish_event(
    event_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.update_event_status(db, event_id, user.tenant_id, "published")
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event published"}


@router.post("/{event_id}/cancel")
async def cancel_event(
    event_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.update_event_status(db, event_id, user.tenant_id, "cancelled")
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event cancelled"}


# ── Tickets ──────────────────────────────────────────────────

@router.get("/{event_id}/tickets", response_model=list[TicketResponse])
async def list_tickets(
    event_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    return await crud.list_tickets(db, event_id)


@router.post("/{event_id}/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    event_id: str,
    data: TicketCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ticket = await crud.create_ticket(db, event_id, user.tenant_id, data.model_dump())
    return TicketResponse.model_validate(ticket)


# ── Registration ─────────────────────────────────────────────

@router.get("/{event_id}/registrations")
async def list_registrations(
    event_id: str,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.list_registrations(db, event_id, status=status_filter, page=page, per_page=per_page)
    return {"items": items, "total": total}


@router.post("/{event_id}/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_event(
    event_id: str,
    data: RegistrationCreate,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        # Resolve user to member_profile id
        from app.modules.members.models import MemberProfile
        from sqlalchemy import select as sel
        mp_result = await db.execute(sel(MemberProfile).where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id))
        mp = mp_result.scalar_one_or_none()
        member_id = mp.id if mp else user.sub
        reg = await crud.register_member(db, event_id, member_id, user.tenant_id, data.model_dump())

        # Send registration confirmation email
        try:
            from app.core.notifications import notify_event_registration
            from app.modules.members.models import User
            from sqlalchemy import select
            user_result = await db.execute(select(User).where(User.id == user.sub))
            db_user = user_result.scalar_one_or_none()
            event = await crud.get_event(db, event_id, user.tenant_id)
            if db_user and event:
                name = f"{db_user.first_name} {db_user.last_name}"
                event_date = event.start_date.strftime("%B %d, %Y at %I:%M %p") if event.start_date else "TBD"
                notify_event_registration(event.title, event_date, db_user.email, name)
        except Exception:
            pass

        return RegistrationResponse(
            **{c.key: getattr(reg, c.key) for c in EventRegistration.__table__.columns if hasattr(reg, c.key)},
            member_name="", ticket_name="",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/registrations/{registration_id}/cancel")
async def cancel_registration(
    registration_id: str,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await crud.cancel_registration(db, registration_id, user.tenant_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Registration cancelled"}


@router.post("/registrations/{registration_id}/checkin")
async def check_in_attendee(
    registration_id: str,
    data: CheckInRequest,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    reg = await crud.check_in(db, registration_id, data.method)
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found or not confirmed")
    return {"message": "Checked in", "checked_in_at": reg.checked_in_at.isoformat()}


# ── Speakers ─────────────────────────────────────────────────

@router.get("/{event_id}/speakers", response_model=list[SpeakerResponse])
async def list_speakers(
    event_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.get_event(db, event_id, user.tenant_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return [SpeakerResponse(
        id=s.id, name=s.name, title=s.title, company=s.company,
        bio=s.bio, avatar_url=s.avatar_url, is_keynote=s.is_keynote,
    ) for s in event.speakers]


@router.post("/{event_id}/speakers", response_model=SpeakerResponse, status_code=status.HTTP_201_CREATED)
async def add_speaker(
    event_id: str,
    data: SpeakerCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    speaker = await crud.create_speaker(db, event_id, user.tenant_id, data.model_dump())
    return SpeakerResponse.model_validate(speaker)


# ── Sessions ─────────────────────────────────────────────────

@router.get("/{event_id}/sessions", response_model=list[SessionResponse])
async def list_sessions(
    event_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    event = await crud.get_event(db, event_id, user.tenant_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return [SessionResponse(
        id=s.id, title=s.title, description=s.description,
        session_type=str(s.session_type), start_time=s.start_time,
        end_time=s.end_time, room=s.room, track=s.track,
    ) for s in event.sessions]


@router.post("/{event_id}/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def add_session(
    event_id: str,
    data: SessionCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    session = await crud.create_session(db, event_id, user.tenant_id, data.model_dump())
    return SessionResponse.model_validate(session)


# ── Feedback ─────────────────────────────────────────────────

@router.get("/{event_id}/feedback", response_model=list[FeedbackResponse])
async def list_feedback(
    event_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    feedback = await crud.get_event_feedback(db, event_id)
    return [FeedbackResponse.model_validate(f) for f in feedback]


@router.post("/{event_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    event_id: str,
    data: FeedbackCreate,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.modules.members.models import MemberProfile
    from sqlalchemy import select
    result = await db.execute(select(MemberProfile).where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id))
    mp = result.scalar_one_or_none()
    member_id = mp.id if mp else user.sub
    fb = await crud.submit_feedback(db, event_id, member_id, user.tenant_id, data.model_dump())
    return FeedbackResponse.model_validate(fb)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await crud.delete_event(db, event_id, user.tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Event not found")
    return None
