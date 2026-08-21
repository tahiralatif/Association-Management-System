"""Member routes — complete API endpoints."""

import json
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    ChangePasswordRequest,
    get_current_user,
    hash_password,
    require_admin,
    require_staff,
    TokenPayload,
    verify_password,
)
from app.core.database import get_db
from app.modules.members import crud
from app.modules.members.models import User
from app.modules.members.schemas import (
    BulkStatusUpdate,
    SingleStatusUpdate,
    BulkDeleteRequest,
    BulkTagRequest,
    ChangePasswordRequest as ChangePasswordSchema,
    ExportParams,
    GroupCreate,
    GroupMemberAdd,
    GroupMemberUpdate,
    GroupResponse,
    GroupUpdate,
    GroupWithMembers,
    ImportResult,
    MemberProfileResponse,
    MemberProfileUpdate,
    MemberStatsResponse,
    NoteCreate,
    NoteResponse,
    PaginatedResponse,
    SelfServiceProfileUpdate,
    TagCreate,
    TagResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
    UserWithProfile,
)

router = APIRouter()


# ── Self-Service (Member Portal) ─────────────────────────────

@router.get("/me", response_model=UserWithProfile)
async def get_my_profile(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's own profile."""
    from sqlalchemy import select as _sel
    from sqlalchemy.orm import selectinload as _sload
    from app.modules.members.models import MemberProfile, MemberGroupMembership

    # Load user with member_profile
    result = await db.execute(
        _sel(User)
        .options(
            _sload(User.member_profile)
            .selectinload(MemberProfile.group_memberships)
            .selectinload(MemberGroupMembership.group)
        )
        .where(User.id == user.sub, User.tenant_id == user.tenant_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Build response with groups
    resp = UserWithProfile.model_validate(member)
    if resp.member_profile and member.member_profile:
        groups = []
        for gm in (member.member_profile.group_memberships or []):
            if gm.is_active and gm.group:
                groups.append(gm.group.name)
        resp.member_profile.groups = groups

    return resp


@router.patch("/me", response_model=UserWithProfile)
async def update_my_profile(
    data: SelfServiceProfileUpdate,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's own profile."""
    from datetime import datetime, timezone
    from app.modules.members.models import MemberProfile as MemberProfileModel, MemberStatus

    member = await crud.get_user_by_id(db, user.sub, user.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="User not found")

    # Auto-create profile if missing (defensive — should exist for all users)
    if not member.member_profile:
        profile = MemberProfileModel(
            user_id=member.id,
            tenant_id=user.tenant_id,
            status=MemberStatus.ACTIVE,
            tier="FREE",
            joined_at=datetime.now(timezone.utc),
        )
        db.add(profile)
        await db.flush()
        member = await crud.get_user_by_id(db, user.sub, user.tenant_id)

    if not member or not member.member_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update User-level fields (first_name, last_name) if provided
    updates = data.model_dump(exclude_unset=True)
    user_updates = {}
    for field in ("first_name", "last_name"):
        if field in updates:
            user_updates[field] = updates.pop(field)
    if user_updates:
        for k, v in user_updates.items():
            if v is not None:
                setattr(member, k, v)

    await crud.update_member_profile(db, member.member_profile.id, user.tenant_id, updates)

    # Refresh
    member = await crud.get_user_by_id(db, user.sub, user.tenant_id)
    return UserWithProfile.model_validate(member)


@router.post("/me/change-password")
async def change_my_password(
    data: ChangePasswordSchema,
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    from app.modules.members.models import User

    db_user = await db.get(User, user.sub)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(data.current_password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    db_user.hashed_password = hash_password(data.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


@router.get("/me/membership")
async def get_my_membership(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's membership status."""
    from sqlalchemy import select as _sel
    from sqlalchemy.orm import selectinload as _sload
    from app.modules.members.models import MemberProfile, MemberGroupMembership

    result = await db.execute(
        _sel(MemberProfile)
        .options(
            _sload(MemberProfile.group_memberships).selectinload(MemberGroupMembership.group),
        )
        .where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Member profile not found")

    groups = []
    for gm in (profile.group_memberships or []):
        if gm.is_active and gm.group:
            groups.append(gm.group.name)

    return {
        "member_number": profile.member_number,
        "tier": str(profile.tier),
        "status": str(profile.status),
        "joined_at": profile.joined_at.isoformat() if profile.joined_at else None,
        "expires_at": profile.expires_at.isoformat() if profile.expires_at else None,
        "renewal_date": profile.renewal_date.isoformat() if profile.renewal_date else None,
        "auto_renew": profile.auto_renew,
        "engagement_score": profile.engagement_score,
        "groups": groups,
    }


@router.get("/me/activity")
async def get_my_activity(
    limit: int = Query(20, ge=1, le=100),
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's recent activity."""
    from app.modules.members.models import MemberActivityLog
    from sqlalchemy import select

    result = await db.execute(
        select(MemberActivityLog)
        .where(MemberActivityLog.user_id == user.sub)
        .order_by(MemberActivityLog.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()

    return [
        {
            "action": a.action,
            "details": a.details,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]


@router.get("/me/events")
async def get_my_events(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Browse upcoming events (member portal)."""
    from sqlalchemy import select
    from app.modules.events.models import Event, EventRegistration, EventStatus, RegistrationStatus
    from app.modules.members.models import MemberProfile

    # Resolve member_profile ID for the current user
    mp_result = await db.execute(
        select(MemberProfile.id)
        .where(MemberProfile.user_id == user.sub, MemberProfile.tenant_id == user.tenant_id)
    )
    member_profile_id = mp_result.scalar_one_or_none()

    result = await db.execute(
        select(Event)
        .where(Event.status == EventStatus.PUBLISHED, Event.tenant_id == user.tenant_id)
        .order_by(Event.start_date.asc())
        .limit(50)
    )
    events = result.scalars().all()

    registered_ids: set = set()
    if member_profile_id:
        reg_result = await db.execute(
            select(EventRegistration.event_id)
            .where(
                EventRegistration.member_id == member_profile_id,
                EventRegistration.tenant_id == user.tenant_id,
                EventRegistration.status != RegistrationStatus.CANCELLED,
            )
        )
        registered_ids = {r[0] for r in reg_result.all()}

    return [
        {
            "id": e.id,
            "title": e.name,
            "description": e.description,
            "start_date": e.start_date.isoformat() if e.start_date else None,
            "end_date": e.end_date.isoformat() if e.end_date else None,
            "location": e.venue_name,
            "event_type": str(e.event_type),
            "is_registered": e.id in registered_ids,
        }
        for e in events
    ]


@router.get("/me/documents")
async def get_my_documents(
    user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Browse documents (member portal)."""
    from sqlalchemy import select
    from app.modules.documents.models import Document
    result = await db.execute(
        select(Document)
        .where(
            Document.tenant_id == user.tenant_id,
            Document.status.notin_(['archived']),
        )
        .order_by(Document.created_at.desc())
        .limit(50)
    )
    docs = result.scalars().all()

    return [
        {
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


# ── Admin: Member Management ─────────────────────────────────

@router.get("/", response_model=PaginatedResponse)
async def list_members(
    tier: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    group_id: str | None = Query(None),
    tags: str | None = Query(None, description="Comma-separated tag names"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List members with advanced filtering and pagination."""
    tag_list = [t.strip() for t in tags.split(",")] if tags else None

    members, total = await crud.list_members(
        db, user.tenant_id,
        tier=tier,
        status=status_filter,
        search=search,
        group_id=group_id,
        tags=tag_list,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return PaginatedResponse(
        items=[UserWithProfile.model_validate(m) for m in members],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/stats", response_model=MemberStatsResponse)
async def get_member_stats(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive member statistics."""
    stats = await crud.get_member_stats(db, user.tenant_id)
    return MemberStatsResponse(**stats)


@router.get("/groups")
async def list_groups_short(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List all groups (alias)."""
    groups = await crud.list_groups(db, user.tenant_id)
    return groups


@router.get("/tags")
async def list_tags_short(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List all tags (alias)."""
    tags = await crud.list_tags(db, user.tenant_id)
    return tags

@router.get("/{user_id}", response_model=UserWithProfile)
async def get_member(
    user_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Get a single member by ID."""
    member = await crud.get_user_by_id(db, user_id, user.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return UserWithProfile.model_validate(member)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    data: UserCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new member (admin only)."""
    from app.core.auth import hash_password
    from app.modules.members.models import User

    existing = await crud.get_user_by_email(db, data.email, user.tenant_id)
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        tenant_id=user.tenant_id,
        roles=data.roles,
    )
    db.add(new_user)
    await db.flush()

    await crud.create_member_profile(db, user.tenant_id, new_user.id)

    # Fire integration event
    from app.core.events import emit_member_event
    await emit_member_event(db, user.tenant_id, "create", {
        "member_id": str(new_user.id),
        "email": new_user.email,
        "name": f"{new_user.first_name} {new_user.last_name}",
    })
    await db.commit()

    return UserResponse.model_validate(new_user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_member(
    user_id: str,
    data: UserUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a member (admin only)."""
    member = await crud.get_user_by_id(db, user_id, user.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(member, key, value)

    await db.flush()
    return UserResponse.model_validate(member)


@router.patch("/{user_id}/profile", response_model=MemberProfileResponse)
async def update_member_profile(
    user_id: str,
    data: MemberProfileUpdate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's extended profile."""
    member = await crud.get_user_by_id(db, user_id, user.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if not member.member_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    updates = data.model_dump(exclude_unset=True)
    profile = await crud.update_member_profile(db, member.member_profile.id, user.tenant_id, updates)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return MemberProfileResponse.model_validate(profile)


@router.patch("/{user_id}/status")
async def update_member_status(
    user_id: str,
    data: SingleStatusUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update member status (admin only)."""
    member = await crud.get_user_by_id(db, user_id, user.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if not member.member_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    await crud.update_member_profile(
        db, member.member_profile.id, user.tenant_id, {"status": data.status}
    )
    return {"message": f"Member status updated to {data.status}"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    user_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a member (admin only)."""
    member = await crud.get_user_by_id(db, user_id, user.tenant_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.is_active = False
    # Also deactivate the member profile so stats update
    from sqlalchemy import select
    from app.modules.members.models import MemberProfile
    mp = await db.execute(
        select(MemberProfile).where(
            MemberProfile.user_id == user_id,
            MemberProfile.tenant_id == user.tenant_id,
        ).limit(1)
    )
    profile = mp.scalar_one_or_none()
    if profile:
        profile.status = "cancelled"
    await db.flush()


@router.post("/bulk/delete")
async def bulk_delete_members(
    data: BulkDeleteRequest,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete multiple members (admin only)."""
    from sqlalchemy import select
    from app.modules.members.models import MemberProfile
    count = 0
    for mid in data.member_ids:
        member = await crud.get_user_by_id(db, mid, user.tenant_id)
        if member:
            member.is_active = False
            # Also deactivate the member profile
            mp = await db.execute(
                select(MemberProfile).where(
                    MemberProfile.user_id == mid,
                    MemberProfile.tenant_id == user.tenant_id,
                ).limit(1)
            )
            profile = mp.scalar_one_or_none()
            if profile:
                profile.status = "cancelled"
            count += 1
    await db.flush()
    return {"message": f"Deleted {count} members", "count": count}


# ── Bulk Operations ──────────────────────────────────────────

@router.post("/bulk/tag")
async def bulk_tag_members(
    data: BulkTagRequest,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add tags to multiple members."""
    count = await crud.bulk_tag_members(db, data.member_ids, data.tag_ids)
    return {"message": f"Tagged {count} members"}


@router.post("/bulk/status")
async def bulk_update_status(
    data: BulkStatusUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update status for multiple members."""
    count = 0
    for member_id in data.member_ids:
        member = await crud.get_user_by_id(db, member_id, user.tenant_id)
        if member and member.member_profile:
            await crud.update_member_profile(
                db, member.member_profile.id, user.tenant_id, {"status": data.status}
            )
            count += 1
    return {"message": f"Updated {count} members to {data.status}"}


# ── Import/Export ────────────────────────────────────────────

@router.post("/import", response_model=ImportResult)
async def import_members(
    file: UploadFile = File(...),
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Import members from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    csv_text = content.decode("utf-8")

    return await crud.import_members_from_csv(db, user.tenant_id, csv_text)


@router.get("/export/csv")
async def export_members_csv(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Export members to CSV."""
    csv_data = await crud.export_members_to_csv(db, user.tenant_id)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=members.csv"},
    )


@router.get("/export/json")
async def export_members_json(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Export members to JSON."""
    data = await crud.export_members_to_json(db, user.tenant_id)
    return data


# ── Tags ─────────────────────────────────────────────────────

@router.get("/tags/all", response_model=list[TagResponse])
async def list_tags(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List all tags for this tenant."""
    tags = await crud.list_tags(db, user.tenant_id)
    return [TagResponse(**t) for t in tags]


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tag."""
    tag = await crud.create_tag(db, user.tenant_id, data.name, data.color)
    return TagResponse(id=tag.id, name=tag.name, color=tag.color, member_count=0)


# ── Notes ────────────────────────────────────────────────────

@router.get("/{user_id}/notes", response_model=list[NoteResponse])
async def list_member_notes(
    user_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List notes for a member."""
    notes = await crud.list_member_notes(db, user_id, user.tenant_id)
    return [
        NoteResponse(
            id=n.id,
            content=n.content,
            author_name="Staff",  # Would resolve from author_id in production
            is_pinned=n.is_pinned,
            created_at=n.created_at,
        )
        for n in notes
    ]


@router.post("/{user_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def add_member_note(
    user_id: str,
    data: NoteCreate,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Add a note to a member."""
    # Resolve user_id to member_profile.id for the FK
    from sqlalchemy import select
    from app.modules.members.models import MemberProfile
    result = await db.execute(select(MemberProfile).where(MemberProfile.user_id == user_id, MemberProfile.tenant_id == user.tenant_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Member profile not found")
    note = await crud.create_member_note(
        db, profile.id, user.sub, user.tenant_id, data.content, data.is_pinned
    )
    return NoteResponse(
        id=note.id,
        content=note.content,
        author_name="Staff",
        is_pinned=note.is_pinned,
        created_at=note.created_at,
    )


# ── Groups ───────────────────────────────────────────────────

@router.get("/groups/all", response_model=list[GroupResponse])
async def list_groups(
    group_type: str | None = Query(None),
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """List all groups."""
    groups = await crud.list_groups(db, user.tenant_id, group_type)
    # Eagerly load memberships to avoid lazy load in async context
    for g in groups:
        await db.refresh(g, ['memberships'])
    result = []
    for g in groups:
        result.append(GroupResponse(
            id=g.id, tenant_id=g.tenant_id, name=g.name, description=g.description,
            group_type=str(g.group_type), parent_id=g.parent_id,
            max_members=g.max_members, meeting_schedule=g.meeting_schedule,
            contact_email=g.contact_email, is_active=g.is_active,
            member_count=len([m for m in g.memberships if m.is_active]),
            created_at=g.created_at,
        ))
    return result


@router.get("/groups/{group_id}", response_model=GroupWithMembers)
async def get_group(
    group_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Get a group with its members."""
    group = await crud.get_group_by_id(db, group_id, user.tenant_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = []
    for m in group.memberships:
        if m.is_active and m.member and m.member.user:
            members.append({
                "member_id": m.member_id,
                "user_name": f"{m.member.user.first_name} {m.member.user.last_name}",
                "email": m.member.user.email,
                "role": str(m.role),
                "joined_at": m.joined_at,
                "is_active": m.is_active,
            })

    return GroupWithMembers(
        id=group.id, tenant_id=group.tenant_id, name=group.name, description=group.description,
        group_type=str(group.group_type), parent_id=group.parent_id,
        max_members=group.max_members, meeting_schedule=group.meeting_schedule,
        contact_email=group.contact_email, is_active=group.is_active,
        member_count=len([m for m in group.memberships if m.is_active]),
        created_at=group.created_at,
        members=members,
    )


@router.post("/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new group."""
    group = await crud.create_group(db, user.tenant_id, data.model_dump())
    return GroupResponse(
        id=group.id, tenant_id=group.tenant_id, name=group.name, description=group.description,
        group_type=str(group.group_type), parent_id=group.parent_id,
        max_members=group.max_members, meeting_schedule=group.meeting_schedule,
        contact_email=group.contact_email, is_active=group.is_active,
        member_count=0, created_at=group.created_at,
    )


@router.patch("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    data: GroupUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a group."""
    updates = data.model_dump(exclude_unset=True)
    group = await crud.update_group(db, group_id, user.tenant_id, updates)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupResponse(
        id=group.id, tenant_id=group.tenant_id, name=group.name, description=group.description,
        group_type=str(group.group_type), parent_id=group.parent_id,
        max_members=group.max_members, meeting_schedule=group.meeting_schedule,
        contact_email=group.contact_email, is_active=group.is_active,
        member_count=len([m for m in group.memberships if m.is_active]),
        created_at=group.created_at,
    )


@router.post("/groups/{group_id}/members")
async def add_to_group(
    group_id: str,
    data: GroupMemberAdd,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to a group.
    
    Accepts either a user_id or member_profile_id — resolves to member_profile.id.
    Sends in-app notification + email to the member.
    """
    from app.modules.members.models import MemberProfile, MemberGroup
    from app.modules.communications.crud import create_notification
    from app.modules.communications.models import Notification
    from sqlalchemy import select

    # Resolve to member_profile.id
    result = await db.execute(select(MemberProfile).where(MemberProfile.user_id == data.member_id))
    mp = result.scalar_one_or_none()
    if not mp:
        result2 = await db.execute(select(MemberProfile).where(MemberProfile.id == data.member_id))
        mp = result2.scalar_one_or_none()
    if not mp:
        raise HTTPException(status_code=404, detail="Member profile not found for this user")

    # Get group name for the notification
    grp_result = await db.execute(select(MemberGroup).where(MemberGroup.id == group_id))
    grp = grp_result.scalar_one_or_none()
    group_name = grp.name if grp else "a group"

    # Get the user_id for notifications (from MemberProfile.user_id)
    target_user_id = mp.user_id

    try:
        membership = await crud.add_member_to_group(
            db, group_id, mp.id, user.tenant_id, data.role
        )

        # ── In-app notification ────────────────────────────────────────
        await create_notification(db, user.tenant_id, {
            "user_id": target_user_id,
            "title": f"Added to {group_name}",
            "message": f"You have been added to the group \"{group_name}\" as {data.role}.",
            "notification_type": "info",
            "link": "/members",
        })

        # ── Email notification (background, best-effort) ───────────────
        try:
            from app.modules.members.models import User
            user_result = await db.execute(select(User).where(User.id == target_user_id))
            target_user = user_result.scalar_one_or_none()
            if target_user and target_user.email:
                from app.core.email.service import send_email
                from app.core.database import async_session_factory
                import asyncio

                async def _send_group_email():
                    try:
                        async with async_session_factory() as email_db:
                            await send_email(
                                to=target_user.email,
                                subject=f"You've been added to {group_name}",
                                html_body=f"""
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #0d9488;">You've been added to a group</h2>
                                    <p>Hello {target_user.first_name},</p>
                                    <p>You have been added to <strong>{group_name}</strong> as <em>{data.role}</em>.</p>
                                    <p>Log in to your account to see more details.</p>
                                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                                    <p style="color: #888; font-size: 12px;">Association Management System</p>
                                </div>
                                """,
                                tenant_id=user.tenant_id,
                                db=email_db,
                            )
                            await email_db.commit()
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).warning(f"Failed to send group notification email: {e}")

                asyncio.create_task(_send_group_email())
        except Exception:
            pass  # Email is best-effort, don't fail the request

        return {"message": "Member added to group", "membership_id": membership.id}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/groups/{group_id}/members/{member_id}")
async def remove_from_group(
    group_id: str,
    member_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from a group."""
    from app.modules.members.models import MemberProfile
    from sqlalchemy import select

    # Resolve to member_profile.id if needed
    result = await db.execute(select(MemberProfile).where(MemberProfile.user_id == member_id))
    mp = result.scalar_one_or_none()
    actual_id = mp.id if mp else member_id

    removed = await crud.remove_member_from_group(db, group_id, actual_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": "Member removed from group"}


@router.patch("/groups/{group_id}/members/{member_id}")
async def update_group_member(
    group_id: str,
    member_id: str,
    data: GroupMemberUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a member's role in a group."""
    if data.role:
        membership = await crud.update_group_member_role(db, group_id, member_id, data.role)
        if not membership:
            raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": "Group membership updated"}


# ── Membership Lifecycle (Admin triggers) ───────────────────────────────


@router.post("/lifecycle/check-renewals")
async def trigger_check_renewals(user: TokenPayload = Depends(require_admin)):
    """Manually trigger membership renewal reminder checks."""
    from app.tasks.memberships import check_membership_renewals
    result = check_membership_renewals.delay()
    return {"message": "Renewal check queued", "task_id": result.id}


@router.post("/lifecycle/process-renewals")
async def trigger_process_renewals(user: TokenPayload = Depends(require_admin)):
    """Manually trigger auto-renewal processing."""
    from app.tasks.memberships import process_auto_renewals
    result = process_auto_renewals.delay()
    return {"message": "Auto-renewal processing queued", "task_id": result.id}


@router.post("/lifecycle/mark-lapsed")
async def trigger_mark_lapsed(user: TokenPayload = Depends(require_admin)):
    """Manually trigger lapse marking for expired memberships."""
    from app.tasks.memberships import mark_lapsed_memberships
    result = mark_lapsed_memberships.delay()
    return {"message": "Lapse marking queued", "task_id": result.id}
