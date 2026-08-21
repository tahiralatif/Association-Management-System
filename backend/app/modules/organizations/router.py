"""Organization routes — public-facing for signup discovery + profile."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import require_admin
from app.modules.organizations.models import Organization
from app.modules.organizations.schemas import OrgProfileUpdate

router = APIRouter()


# ── Public endpoints ────────────────────────────────────────────────────

@router.get("")
async def list_organizations(
    q: str | None = Query(None, description="Search by name or slug"),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: list active organizations for signup.
    
    Supports optional search query to filter by name or slug.
    Returns only active organizations so new members find real associations.
    """
    stmt = select(Organization).where(Organization.is_active == True)

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Organization.name.ilike(pattern),
                Organization.slug.ilike(pattern),
            )
        )

    stmt = stmt.order_by(Organization.name).limit(50)
    result = await db.execute(stmt)
    orgs = result.scalars().all()

    return [
        {
            "id": o.id,
            "slug": o.slug,
            "name": o.name,
            "description": o.description,
            "logo_url": o.logo_url,
            "website": o.website,
        }
        for o in orgs
    ]


@router.get("/by-slug/{slug}")
async def get_organization_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: get full organization profile by slug.
    
    Used for the public /org/{slug} profile page. Returns all public-facing
    fields including tagline, hero image, about content, social links, and
    the join CTA configuration.
    """
    result = await db.execute(
        select(Organization).where(
            Organization.slug == slug,
            Organization.is_active == True,
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "id": org.id,
        "slug": org.slug,
        "name": org.name,
        # Basic fields
        "description": org.description,
        "logo_url": org.logo_url,
        "website": org.website,
        "contact_email": org.contact_email,
        # Profile fields
        "tagline": org.tagline,
        "phone": org.phone,
        "address": org.address,
        "hero_image": org.hero_image,
        "about_html": org.about_html,
        "social_links": org.social_links or {},
        "join_cta_text": org.join_cta_text or "Join Us",
        "join_cta_url": org.join_cta_url or f"/register?org={slug}",
        # Metadata
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


# ── Admin endpoints (tenant_admin manages their own org) ────────────────

@router.get("/my-profile")
async def get_my_org_profile(
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: get the current org's full profile for editing."""
    result = await db.execute(
        select(Organization).where(Organization.tenant_id == user.tenant_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "id": org.id,
        "slug": org.slug,
        "name": org.name,
        "description": org.description,
        "logo_url": org.logo_url,
        "website": org.website,
        "contact_email": org.contact_email,
        "tagline": org.tagline,
        "phone": org.phone,
        "address": org.address,
        "hero_image": org.hero_image,
        "about_html": org.about_html,
        "social_links": org.social_links or {},
        "join_cta_text": org.join_cta_text or "Join Us",
        "join_cta_url": org.join_cta_url,
    }


@router.put("/my-profile")
async def update_my_org_profile(
    payload: OrgProfileUpdate,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: update the current org's public profile.
    
    Only tenant_admin and staff can edit. Fields not included in the
    request body are left unchanged (partial update).
    """
    result = await db.execute(
        select(Organization).where(Organization.tenant_id == user.tenant_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    await db.commit()
    await db.refresh(org)

    return {
        "message": "Profile updated successfully",
        "slug": org.slug,
        "public_url": f"/org/{org.slug}",
    }
