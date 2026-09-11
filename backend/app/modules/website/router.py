"""Website Builder — API routes for managing association websites."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import require_admin, require_member, TokenPayload
from app.modules.website import crud
from app.modules.website.schemas import (
    ComponentCreate,
    ComponentResponse,
    ComponentUpdate,
    PageCreate,
    PageListResponse,
    PageResponse,
    PageUpdate,
    PublicPageResponse,
    PublicSiteResponse,
    ThemeResponse,
    ThemeUpdate,
)

router = APIRouter(tags=["Website Builder"])


# ── Admin: Pages ─────────────────────────────────────────────

@router.get("/pages", response_model=PageListResponse)
async def list_pages(
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all website pages (admin — includes drafts)."""
    pages = await crud.list_pages(db, user.tenant_id, include_unpublished=True)
    return PageListResponse(
        pages=[PageResponse.model_validate(p) for p in pages],
        total=len(pages),
    )


@router.post("/pages", response_model=PageResponse, status_code=201)
async def create_page(
    req: PageCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new website page."""
    # Check slug uniqueness
    existing = await crud.get_page_by_slug(db, req.slug, user.tenant_id)
    if existing:
        raise HTTPException(status_code=400, detail="A page with this slug already exists")

    page = await crud.create_page(db, user.tenant_id, req.model_dump())
    # Eagerly load components for response
    await db.refresh(page, ["components"])
    return PageResponse.model_validate(page)


@router.get("/pages/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a page by ID."""
    page = await crud.get_page(db, page_id, user.tenant_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return PageResponse.model_validate(page)


@router.patch("/pages/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: str,
    req: PageUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a page."""
    data = req.model_dump(exclude_unset=True)
    page = await crud.update_page(db, page_id, user.tenant_id, data)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.refresh(page, ["components"])
    return PageResponse.model_validate(page)


@router.delete("/pages/{page_id}", status_code=204)
async def delete_page(
    page_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a page and all its components."""
    deleted = await crud.delete_page(db, page_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Page not found")


# ── Admin: Components ────────────────────────────────────────

@router.post("/pages/{page_id}/components", response_model=ComponentResponse, status_code=201)
async def add_component(
    page_id: str,
    req: ComponentCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Add a component to a page."""
    component = await crud.add_component(db, page_id, user.tenant_id, req.model_dump())
    if not component:
        raise HTTPException(status_code=404, detail="Page not found")
    return ComponentResponse.model_validate(component)


@router.patch("/components/{component_id}", response_model=ComponentResponse)
async def update_component(
    component_id: str,
    req: ComponentUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a component."""
    data = req.model_dump(exclude_unset=True)
    component = await crud.update_component(db, component_id, user.tenant_id, data)
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    return ComponentResponse.model_validate(component)


@router.delete("/components/{component_id}", status_code=204)
async def delete_component(
    component_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a component."""
    deleted = await crud.delete_component(db, component_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Component not found")


@router.post("/pages/{page_id}/reorder")
async def reorder_components(
    page_id: str,
    component_ids: list[str],
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reorder components on a page (pass component IDs in desired order)."""
    from sqlalchemy import update
    from app.modules.website.models import WebsiteComponent

    for idx, cid in enumerate(component_ids):
        await db.execute(
            update(WebsiteComponent)
            .where(WebsiteComponent.id == cid, WebsiteComponent.page_id == page_id)
            .values(sort_order=idx)
        )
    await db.flush()
    return {"message": "Components reordered"}


# ── Admin: Theme ─────────────────────────────────────────────

@router.get("/theme", response_model=ThemeResponse)
async def get_theme(
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get website theme."""
    theme = await crud.get_theme(db, user.tenant_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not configured")
    return ThemeResponse.model_validate(theme)


@router.patch("/theme", response_model=ThemeResponse)
async def update_theme(
    req: ThemeUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create or update website theme."""
    data = req.model_dump(exclude_unset=True)
    theme = await crud.upsert_theme(db, user.tenant_id, data)
    return ThemeResponse.model_validate(theme)


# ── Public: Site ─────────────────────────────────────────────

@router.get("/site/{tenant_slug}", response_model=PublicSiteResponse)
async def get_public_site(
    tenant_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the public website for rendering (no auth required)."""
    from app.modules.organizations.models import Organization

    from sqlalchemy import select

    # Resolve tenant slug to tenant_id
    result = await db.execute(
        select(Organization).where(Organization.slug == tenant_slug)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    site = await crud.get_public_site(db, org.tenant_id)
    pages = [
        PublicPageResponse(
            title=p.title,
            slug=p.slug,
            description=p.description,
            components=[ComponentResponse.model_validate(c) for c in p.components if c.is_visible],
            meta_title=p.meta_title,
            meta_description=p.meta_description,
        )
        for p in site["pages"]
    ]

    return PublicSiteResponse(
        organization_name=org.name,
        theme=ThemeResponse.model_validate(site["theme"]) if site["theme"] else None,
        pages=pages,
        homepage=PublicPageResponse(
            title=site["homepage"].title,
            slug=site["homepage"].slug,
            description=site["homepage"].description,
            components=[ComponentResponse.model_validate(c) for c in site["homepage"].components if c.is_visible],
            meta_title=site["homepage"].meta_title,
            meta_description=site["homepage"].meta_description,
        ) if site["homepage"] else None,
    )
