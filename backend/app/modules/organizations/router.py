"""Organization routes — public-facing for signup discovery."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.organizations.models import Organization

router = APIRouter()


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
    """Public endpoint: get a single organization by slug.
    
    Used to validate an org slug during registration and display org info.
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
        "description": org.description,
        "logo_url": org.logo_url,
        "website": org.website,
    }
