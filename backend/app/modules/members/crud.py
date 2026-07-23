"""Member CRUD — complete database operations."""

import csv
import io
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import func, select, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.members.models import (
    MemberGroup,
    MemberGroupMembership,
    MemberNote,
    MemberProfile,
    MemberProfileTag,
    MemberStatus,
    MemberTag,
    MembershipTier,
    User,
)


# ── User Operations ──────────────────────────────────────────

async def get_user_by_id(db: AsyncSession, user_id: str, tenant_id: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.member_profile))
        .where(User.id == user_id, User.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str, tenant_id: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email, User.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_last_login(db: AsyncSession, user_id: str) -> None:
    user = await db.get(User, user_id)
    if user:
        user.last_login_at = datetime.now(timezone.utc)
        await db.flush()


# ── Member Profile Operations ────────────────────────────────

async def list_members(
    db: AsyncSession,
    tenant_id: str,
    tier: str | None = None,
    status: str | None = None,
    search: str | None = None,
    group_id: str | None = None,
    tags: list[str] | None = None,
    joined_after: datetime | None = None,
    joined_before: datetime | None = None,
    page: int = 1,
    per_page: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[User], int]:
    """List members with advanced filtering and pagination."""
    query = (
        select(User)
        .options(selectinload(User.member_profile))
        .where(User.tenant_id == tenant_id, User.is_active == True)
    )

    # Filter by tier
    if tier:
        query = query.join(MemberProfile, User.id == MemberProfile.user_id).where(
            MemberProfile.tier == tier
        )

    # Filter by status
    if status:
        query = query.join(MemberProfile, User.id == MemberProfile.user_id).where(
            MemberProfile.status == status
        )

    # Search by name, email, or member number
    if search:
        search_filter = or_(
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            MemberProfile.member_number.ilike(f"%{search}%"),
            MemberProfile.organization.ilike(f"%{search}%"),
        )
        query = query.join(MemberProfile, User.id == MemberProfile.user_id).where(search_filter)

    # Filter by group
    if group_id:
        query = (
            query.join(MemberProfile, User.id == MemberProfile.user_id)
            .join(MemberGroupMembership, MemberProfile.id == MemberGroupMembership.member_id)
            .where(MemberGroupMembership.group_id == group_id, MemberGroupMembership.is_active == True)
        )

    # Filter by tags
    if tags:
        query = (
            query.join(MemberProfile, User.id == MemberProfile.user_id)
            .join(MemberProfileTag, MemberProfile.id == MemberProfileTag.member_id)
            .join(MemberTag, MemberProfileTag.tag_id == MemberTag.id)
            .where(MemberTag.name.in_(tags))
        )

    # Date range
    if joined_after or joined_before:
        query = query.join(MemberProfile, User.id == MemberProfile.user_id)
        if joined_after:
            query = query.where(MemberProfile.joined_at >= joined_after)
        if joined_before:
            query = query.where(MemberProfile.joined_at <= joined_before)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    members = list(result.scalars().unique().all())

    return members, total


async def create_member_profile(
    db: AsyncSession, tenant_id: str, user_id: str, tier: str = "basic"
) -> MemberProfile:
    # Validate tier
    valid_tiers = {t.value for t in MembershipTier}
    if tier not in valid_tiers:
        raise ValueError(f"Invalid tier '{tier}'. Must be one of: {', '.join(sorted(valid_tiers))}")

    member_number = f"MEM-{uuid.uuid4().hex[:8].upper()}"
    profile = MemberProfile(
        tenant_id=tenant_id,
        user_id=user_id,
        member_number=member_number,
        tier=MembershipTier(tier),
        status=MemberStatus.ACTIVE,
    )
    db.add(profile)
    await db.flush()
    return profile


async def update_member_profile(
    db: AsyncSession, profile_id: str, tenant_id: str, updates: dict
) -> MemberProfile | None:
    result = await db.execute(
        select(MemberProfile).where(
            MemberProfile.id == profile_id, MemberProfile.tenant_id == tenant_id
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return None

    # Validate tier if being updated
    if "tier" in updates and updates["tier"] is not None:
        valid_tiers = {t.value for t in MembershipTier}
        if updates["tier"] not in valid_tiers:
            raise ValueError(f"Invalid tier '{updates['tier']}'. Must be one of: {', '.join(sorted(valid_tiers))}")

    # Validate status if being updated
    if "status" in updates and updates["status"] is not None:
        valid_statuses = {s.value for s in MemberStatus}
        if updates["status"] not in valid_statuses:
            raise ValueError(f"Invalid status '{updates['status']}'. Must be one of: {', '.join(sorted(valid_statuses))}")

    for key, value in updates.items():
        if value is not None and hasattr(profile, key):
            setattr(profile, key, value)

    await db.flush()
    return profile


async def get_member_stats(db: AsyncSession, tenant_id: str) -> dict:
    """Get comprehensive member statistics."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # Total
    total = await db.execute(
        select(func.count()).select_from(MemberProfile).where(MemberProfile.tenant_id == tenant_id)
    )

    # By status
    status_counts = await db.execute(
        select(MemberProfile.status, func.count())
        .where(MemberProfile.tenant_id == tenant_id)
        .group_by(MemberProfile.status)
    )

    # By tier
    tier_counts = await db.execute(
        select(MemberProfile.tier, func.count())
        .where(MemberProfile.tenant_id == tenant_id)
        .group_by(MemberProfile.tier)
    )

    # Recent joins
    recent = await db.execute(
        select(func.count())
        .select_from(MemberProfile)
        .where(MemberProfile.tenant_id == tenant_id, MemberProfile.joined_at >= thirty_days_ago)
    )

    # Average engagement
    avg_engagement = await db.execute(
        select(func.avg(MemberProfile.engagement_score))
        .select_from(MemberProfile)
        .where(MemberProfile.tenant_id == tenant_id)
    )

    # At risk (churn_risk > 0.7)
    at_risk = await db.execute(
        select(func.count())
        .select_from(MemberProfile)
        .where(MemberProfile.tenant_id == tenant_id, MemberProfile.churn_risk > 0.7)
    )

    # By group
    group_counts = await db.execute(
        select(MemberGroup.name, func.count(MemberGroupMembership.id))
        .join(MemberGroupMembership, MemberGroup.id == MemberGroupMembership.group_id)
        .where(MemberGroup.tenant_id == tenant_id, MemberGroupMembership.is_active == True)
        .group_by(MemberGroup.name)
    )

    # ORM returns Python enum objects (MemberStatus.ACTIVE), .value gives "active"
    status_map = {}
    for s, c in status_counts.all():
        key = s.value.lower() if hasattr(s, 'value') else str(s).lower()
        status_map[key] = c
    return {
        "total": total.scalar() or 0,
        "active": status_map.get("active", 0),
        "pending": status_map.get("pending", 0),
        "lapsed": status_map.get("lapsed", 0),
        "cancelled": status_map.get("cancelled", 0),
        "suspended": status_map.get("suspended", 0),
        "by_tier": {t.value.lower() if hasattr(t, 'value') else str(t).lower(): c for t, c in tier_counts.all()},
        "by_group": {name: count for name, count in group_counts.all()},
        "recent_joins": recent.scalar() or 0,
        "avg_engagement": round(float(avg_engagement.scalar() or 0), 2),
        "at_risk_count": at_risk.scalar() or 0,
    }


# ── Group Operations ─────────────────────────────────────────

async def list_groups(
    db: AsyncSession, tenant_id: str, group_type: str | None = None, include_members: bool = False
) -> list[MemberGroup]:
    query = select(MemberGroup).where(MemberGroup.tenant_id == tenant_id, MemberGroup.is_active == True)

    if group_type:
        query = query.where(MemberGroup.group_type == group_type)

    if include_members:
        query = query.options(
            selectinload(MemberGroup.memberships).selectinload(MemberGroupMembership.member).selectinload(MemberProfile.user)
        )

    query = query.order_by(MemberGroup.name)
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def get_group_by_id(db: AsyncSession, group_id: str, tenant_id: str) -> MemberGroup | None:
    result = await db.execute(
        select(MemberGroup)
        .options(
            selectinload(MemberGroup.memberships)
            .selectinload(MemberGroupMembership.member)
            .selectinload(MemberProfile.user)
        )
        .where(MemberGroup.id == group_id, MemberGroup.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def create_group(db: AsyncSession, tenant_id: str, data: dict) -> MemberGroup:
    group = MemberGroup(tenant_id=tenant_id, **data)
    db.add(group)
    await db.flush()
    return group


async def update_group(db: AsyncSession, group_id: str, tenant_id: str, updates: dict) -> MemberGroup | None:
    group = await get_group_by_id(db, group_id, tenant_id)
    if not group:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(group, key):
            setattr(group, key, value)
    await db.flush()
    return group


async def add_member_to_group(
    db: AsyncSession, group_id: str, member_id: str, tenant_id: str, role: str = "member"
) -> MemberGroupMembership:
    # Check if already a member
    existing = await db.execute(
        select(MemberGroupMembership).where(
            MemberGroupMembership.group_id == group_id,
            MemberGroupMembership.member_id == member_id,
            MemberGroupMembership.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Member already in group")

    membership = MemberGroupMembership(
        group_id=group_id,
        member_id=member_id,
        role=role,
    )
    db.add(membership)
    await db.flush()
    return membership


async def remove_member_from_group(
    db: AsyncSession, group_id: str, member_id: str
) -> bool:
    result = await db.execute(
        select(MemberGroupMembership).where(
            MemberGroupMembership.group_id == group_id,
            MemberGroupMembership.member_id == member_id,
            MemberGroupMembership.is_active == True,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        return False
    membership.is_active = False
    membership.left_at = datetime.now(timezone.utc)
    await db.flush()
    return True


async def update_group_member_role(
    db: AsyncSession, group_id: str, member_id: str, role: str
) -> MemberGroupMembership | None:
    result = await db.execute(
        select(MemberGroupMembership).where(
            MemberGroupMembership.group_id == group_id,
            MemberGroupMembership.member_id == member_id,
            MemberGroupMembership.is_active == True,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        return None
    membership.role = role
    await db.flush()
    return membership


# ── Tag Operations ───────────────────────────────────────────

async def list_tags(db: AsyncSession, tenant_id: str) -> list[dict]:
    result = await db.execute(
        select(MemberTag).where(MemberTag.tenant_id == tenant_id).order_by(MemberTag.name)
    )
    tags = list(result.scalars().all())

    # Get member counts for each tag
    tag_counts = await db.execute(
        select(MemberTag.id, func.count(MemberProfileTag.member_id))
        .join(MemberProfileTag, MemberTag.id == MemberProfileTag.tag_id)
        .where(MemberTag.tenant_id == tenant_id)
        .group_by(MemberTag.id)
    )
    count_map = {tag_id: count for tag_id, count in tag_counts.all()}

    return [
        {
            "id": t.id,
            "name": t.name,
            "color": t.color,
            "member_count": count_map.get(t.id, 0),
        }
        for t in tags
    ]


async def create_tag(db: AsyncSession, tenant_id: str, name: str, color: str = "#3B82F6") -> MemberTag:
    tag = MemberTag(tenant_id=tenant_id, name=name, color=color)
    db.add(tag)
    await db.flush()
    return tag


async def bulk_tag_members(
    db: AsyncSession, member_ids: list[str], tag_ids: list[str]
) -> int:
    count = 0
    for member_id in member_ids:
        for tag_id in tag_ids:
            existing = await db.execute(
                select(MemberProfileTag).where(
                    MemberProfileTag.member_id == member_id,
                    MemberProfileTag.tag_id == tag_id,
                )
            )
            if not existing.scalar_one_or_none():
                db.add(MemberProfileTag(member_id=member_id, tag_id=tag_id))
                count += 1
    await db.flush()
    return count


# ── Note Operations ──────────────────────────────────────────

async def list_member_notes(db: AsyncSession, member_id: str, tenant_id: str) -> list[MemberNote]:
    result = await db.execute(
        select(MemberNote)
        .where(MemberNote.member_id == member_id, MemberNote.tenant_id == tenant_id)
        .order_by(MemberNote.is_pinned.desc(), MemberNote.created_at.desc())
    )
    return list(result.scalars().all())


async def create_member_note(
    db: AsyncSession, member_id: str, author_id: str, tenant_id: str, content: str, is_pinned: bool = False
) -> MemberNote:
    note = MemberNote(
        member_id=member_id,
        author_id=author_id,
        tenant_id=tenant_id,
        content=content,
        is_pinned=is_pinned,
    )
    db.add(note)
    await db.flush()
    return note


# ── Import/Export ────────────────────────────────────────────

async def import_members_from_csv(
    db: AsyncSession, tenant_id: str, csv_content: str
) -> dict:
    """Import members from CSV. Expected columns: email, first_name, last_name, [phone, organization, job_title, tier]."""
    reader = csv.DictReader(io.StringIO(csv_content))
    results = {"total_rows": 0, "successful": 0, "failed": 0, "errors": [], "created_ids": []}

    for i, row in enumerate(reader, start=2):  # start=2 because row 1 is header
        results["total_rows"] += 1

        try:
            # Validate required fields
            if not row.get("email") or not row.get("first_name") or not row.get("last_name"):
                results["errors"].append({"row": i, "error": "Missing required fields (email, first_name, last_name)"})
                results["failed"] += 1
                continue

            # Check if user exists
            existing = await get_user_by_email(db, row["email"].strip(), tenant_id)
            if existing:
                results["errors"].append({"row": i, "error": f"Email {row['email']} already exists"})
                results["failed"] += 1
                continue

            # Create user
            from app.core.auth import hash_password
            user = User(
                email=row["email"].strip(),
                hashed_password=hash_password(uuid.uuid4().hex[:12]),  # random password
                first_name=row["first_name"].strip(),
                last_name=row["last_name"].strip(),
                tenant_id=tenant_id,
                roles=["member"],
            )
            db.add(user)
            await db.flush()

            # Create profile
            profile = await create_member_profile(
                db, tenant_id, user.id,
                tier=row.get("tier", "basic").strip(),
            )

            # Update optional fields
            if row.get("phone"):
                profile.phone = row["phone"].strip()
            if row.get("organization"):
                profile.organization = row["organization"].strip()
            if row.get("job_title"):
                profile.job_title = row["job_title"].strip()

            results["successful"] += 1
            results["created_ids"].append(user.id)

        except Exception as e:
            results["errors"].append({"row": i, "error": str(e)})
            results["failed"] += 1

    return results


async def export_members_to_csv(
    db: AsyncSession, tenant_id: str, fields: list[str] | None = None
) -> str:
    """Export members to CSV."""
    members, _ = await list_members(db, tenant_id, per_page=10000)

    default_fields = [
        "email", "first_name", "last_name", "member_number", "tier",
        "status", "phone", "organization", "job_title", "joined_at",
    ]
    export_fields = fields or default_fields

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=export_fields)
    writer.writeheader()

    for user in members:
        profile = user.member_profile
        row = {}
        for field in export_fields:
            if field in ("email", "first_name", "last_name"):
                row[field] = getattr(user, field, "")
            elif profile:
                val = getattr(profile, field, "")
                if isinstance(val, datetime):
                    val = val.isoformat()
                row[field] = val or ""
            else:
                row[field] = ""
        writer.writerow(row)

    return output.getvalue()


async def export_members_to_json(
    db: AsyncSession, tenant_id: str, fields: list[str] | None = None
) -> list[dict]:
    """Export members to JSON."""
    members, _ = await list_members(db, tenant_id, per_page=10000)
    result = []

    for user in members:
        profile = user.member_profile
        item = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
        }
        if profile:
            item.update({
                "member_number": profile.member_number,
                "tier": str(profile.tier),
                "status": str(profile.status),
                "phone": profile.phone,
                "organization": profile.organization,
                "job_title": profile.job_title,
                "joined_at": profile.joined_at.isoformat() if profile.joined_at else None,
                "engagement_score": profile.engagement_score,
                "churn_risk": profile.churn_risk,
            })
        result.append(item)

    return result
