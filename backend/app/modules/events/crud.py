"""Events CRUD."""

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.members.models import MemberProfile

from app.modules.events.models import (
    Event,
    EventFeedback,
    EventRegistration,
    EventSession,
    EventSpeaker,
    EventSponsor,
    EventStatus,
    EventTicket,
    RegistrationStatus,
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text[:300]


# ── Events ───────────────────────────────────────────────────

async def create_event(db: AsyncSession, tenant_id: str, creator_id: str, data: dict) -> Event:
    event = Event(
        tenant_id=tenant_id,
        created_by=creator_id,
        slug=slugify(data.get("name", "")),
        **data,
    )
    db.add(event)
    await db.flush()
    return event


async def list_events(
    db: AsyncSession, tenant_id: str, status: str | None = None, event_type: str | None = None,
    upcoming_only: bool = False, page: int = 1, per_page: int = 20,
) -> tuple[list[dict], int]:
    query = (
        select(Event)
        .options(selectinload(Event.registrations))
        .where(Event.tenant_id == tenant_id)
    )
    if status:
        query = query.where(Event.status == status)
    if event_type:
        query = query.where(Event.event_type == event_type)
    if upcoming_only:
        query = query.where(Event.start_date >= datetime.now(timezone.utc))

    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Event.start_date.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    events = list(result.scalars().unique().all())

    enriched = []
    for e in events:
        enriched.append({
            **{c.key: getattr(e, c.key) for c in Event.__table__.columns},
            "registration_count": len([r for r in e.registrations if r.status != RegistrationStatus.CANCELLED]),
        })
    return enriched, count


async def get_event(db: AsyncSession, event_id: str, tenant_id: str) -> Event | None:
    result = await db.execute(
        select(Event)
        .options(
            selectinload(Event.sessions),
            selectinload(Event.speakers),
            selectinload(Event.tickets),
            selectinload(Event.sponsors),
            selectinload(Event.registrations),
        )
        .where(Event.id == event_id, Event.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_event_status(db: AsyncSession, event_id: str, tenant_id: str, status: str) -> Event | None:
    event = await get_event(db, event_id, tenant_id)
    if not event:
        return None
    event.status = EventStatus(status)
    await db.flush()
    return event


# ── Tickets ──────────────────────────────────────────────────

async def create_ticket(db: AsyncSession, event_id: str, tenant_id: str, data: dict) -> EventTicket:
    ticket = EventTicket(event_id=event_id, tenant_id=tenant_id, **data)
    db.add(ticket)
    await db.flush()
    return ticket


async def list_tickets(db: AsyncSession, event_id: str) -> list[EventTicket]:
    result = await db.execute(
        select(EventTicket)
        .where(EventTicket.event_id == event_id, EventTicket.is_active == True)
        .order_by(EventTicket.price)
    )
    return list(result.scalars().all())


# ── Registration ─────────────────────────────────────────────

async def register_member(
    db: AsyncSession, event_id: str, member_id: str, tenant_id: str, data: dict
) -> EventRegistration:
    # Check if already registered
    existing = await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.member_id == member_id,
            EventRegistration.status != RegistrationStatus.CANCELLED,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Already registered for this event")

    # Check capacity
    event = await get_event(db, event_id, tenant_id)
    if not event:
        raise ValueError("Event not found")

    if event.max_attendees:
        confirmed = await db.execute(
            select(func.count())
            .select_from(EventRegistration)
            .where(
                EventRegistration.event_id == event_id,
                EventRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.CHECKED_IN]),
            )
        )
        count = confirmed.scalar() or 0
        if count >= event.max_attendees:
            if not event.waitlist_enabled:
                raise ValueError("Event is full")
            status = RegistrationStatus.WAITLISTED
        else:
            status = RegistrationStatus.CONFIRMED
    else:
        status = RegistrationStatus.CONFIRMED

    amount = 0
    if data.get("ticket_id"):
        ticket_result = await db.execute(
            select(EventTicket).where(EventTicket.id == data["ticket_id"])
        )
        ticket = ticket_result.scalar_one_or_none()
        if ticket:
            amount = float(ticket.price)
            ticket.quantity_sold += 1

    registration = EventRegistration(
        event_id=event_id,
        member_id=member_id,
        tenant_id=tenant_id,
        ticket_id=data.get("ticket_id"),
        status=status,
        amount_paid=amount,
        dietary_restrictions=data.get("dietary_restrictions"),
        special_requirements=data.get("special_requirements"),
        emergency_contact=data.get("emergency_contact"),
        emergency_phone=data.get("emergency_phone"),
        custom_fields=data.get("custom_fields", {}),
    )
    db.add(registration)
    await db.flush()
    return registration


async def cancel_registration(
    db: AsyncSession, registration_id: str, tenant_id: str, reason: str | None = None
) -> EventRegistration | None:
    result = await db.execute(
        select(EventRegistration).where(
            EventRegistration.id == registration_id,
            EventRegistration.tenant_id == tenant_id,
        )
    )
    reg = result.scalar_one_or_none()
    if not reg:
        return None
    reg.status = RegistrationStatus.CANCELLED
    reg.cancelled_at = datetime.now(timezone.utc)
    reg.cancellation_reason = reason
    await db.flush()
    return reg


async def check_in(
    db: AsyncSession, registration_id: str, method: str = "manual"
) -> EventRegistration | None:
    result = await db.execute(
        select(EventRegistration).where(EventRegistration.id == registration_id)
    )
    reg = result.scalar_one_or_none()
    if not reg or reg.status != RegistrationStatus.CONFIRMED:
        return None
    reg.status = RegistrationStatus.CHECKED_IN
    reg.checked_in_at = datetime.now(timezone.utc)
    reg.check_in_method = method
    await db.flush()
    return reg


async def list_registrations(
    db: AsyncSession, event_id: str, status: str | None = None, page: int = 1, per_page: int = 50
) -> tuple[list[dict], int]:
    query = (
        select(EventRegistration)
        .options(
            selectinload(EventRegistration.member).selectinload(MemberProfile.user),
            selectinload(EventRegistration.ticket),
        )
        .where(EventRegistration.event_id == event_id)
    )
    if status:
        query = query.where(EventRegistration.status == status)

    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(EventRegistration.registered_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    regs = list(result.scalars().unique().all())

    enriched = []
    for r in regs:
        member_name = ""
        if r.member and hasattr(r.member, "user") and r.member.user:
            member_name = f"{r.member.user.first_name} {r.member.user.last_name}"
        ticket_name = r.ticket.name if r.ticket else ""
        enriched.append({
            **{c.key: getattr(r, c.key) for c in EventRegistration.__table__.columns},
            "member_name": member_name,
            "ticket_name": ticket_name,
        })
    return enriched, count


# ── Speakers ─────────────────────────────────────────────────

async def create_speaker(db: AsyncSession, event_id: str, tenant_id: str, data: dict) -> EventSpeaker:
    speaker = EventSpeaker(event_id=event_id, tenant_id=tenant_id, **data)
    db.add(speaker)
    await db.flush()
    return speaker


# ── Sessions ─────────────────────────────────────────────────

async def create_session(db: AsyncSession, event_id: str, tenant_id: str, data: dict) -> EventSession:
    session = EventSession(event_id=event_id, tenant_id=tenant_id, **data)
    db.add(session)
    await db.flush()
    return session


# ── Feedback ─────────────────────────────────────────────────

async def submit_feedback(
    db: AsyncSession, event_id: str, member_id: str, tenant_id: str, data: dict
) -> EventFeedback:
    feedback = EventFeedback(event_id=event_id, member_id=member_id, tenant_id=tenant_id, **data)
    db.add(feedback)
    await db.flush()
    return feedback


async def get_event_feedback(db: AsyncSession, event_id: str) -> list[EventFeedback]:
    result = await db.execute(
        select(EventFeedback).where(EventFeedback.event_id == event_id).order_by(EventFeedback.created_at.desc())
    )
    return list(result.scalars().all())


# ── Stats ────────────────────────────────────────────────────

async def get_event_stats(db: AsyncSession, tenant_id: str) -> dict:
    now = datetime.now(timezone.utc)

    # Total events
    total = await db.execute(
        select(func.count()).select_from(Event).where(Event.tenant_id == tenant_id)
    )
    total_events = total.scalar() or 0

    # Upcoming
    upcoming = await db.execute(
        select(func.count())
        .select_from(Event)
        .where(Event.tenant_id == tenant_id, Event.start_date >= now, Event.status == EventStatus.PUBLISHED)
    )
    upcoming_count = upcoming.scalar() or 0

    # Total registrations
    reg_count = await db.execute(
        select(func.count())
        .select_from(EventRegistration)
        .join(Event, EventRegistration.event_id == Event.id)
        .where(Event.tenant_id == tenant_id, EventRegistration.status != RegistrationStatus.CANCELLED)
    )
    total_registrations = reg_count.scalar() or 0

    # Total revenue
    revenue = await db.execute(
        select(func.coalesce(func.sum(EventRegistration.amount_paid), 0))
        .join(Event, EventRegistration.event_id == Event.id)
        .where(
            Event.tenant_id == tenant_id,
            EventRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.CHECKED_IN]),
        )
    )
    total_revenue = float(revenue.scalar())

    # Average rating
    rating = await db.execute(
        select(func.coalesce(func.avg(EventFeedback.rating), 0))
        .join(Event, EventFeedback.event_id == Event.id)
        .where(Event.tenant_id == tenant_id)
    )
    avg_rating = float(rating.scalar())

    # Check-in rate
    checked = await db.execute(
        select(func.count())
        .select_from(EventRegistration)
        .join(Event, EventRegistration.event_id == Event.id)
        .where(Event.tenant_id == tenant_id, EventRegistration.status == RegistrationStatus.CHECKED_IN)
    )
    checked_in = checked.scalar() or 0
    check_in_rate = (checked_in / total_registrations * 100) if total_registrations else 0

    return {
        "total_events": total_events,
        "upcoming_events": upcoming_count,
        "total_registrations": total_registrations,
        "total_revenue": total_revenue,
        "average_rating": round(avg_rating, 1),
        "check_in_rate": round(check_in_rate, 1),
        "upcoming": [],
        "recent_registrations": [],
    }


async def delete_event(db: AsyncSession, event_id: str, tenant_id: str) -> bool:
    """Delete an event and cascade-delete related records."""
    from sqlalchemy import delete
    from app.modules.events.models import EventRegistration, EventTicket, EventSpeaker, EventSession, EventFeedback
    
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.tenant_id == tenant_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        return False
    # Delete related records to avoid FK violations
    for model in [EventFeedback, EventSession, EventSpeaker, EventTicket, EventRegistration]:
        await db.execute(delete(model).where(model.event_id == event_id))
    await db.delete(event)
    await db.commit()
    return True
