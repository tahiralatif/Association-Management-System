"""Website Builder — CRUD operations."""

from __future__ import annotations

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.website.models import WebsitePage, WebsiteComponent, WebsiteTheme


# ── Pages ────────────────────────────────────────────────────

async def list_pages(db: AsyncSession, tenant_id: str, include_unpublished: bool = True) -> list[WebsitePage]:
    """List all pages for a tenant."""
    query = (
        select(WebsitePage)
        .where(WebsitePage.tenant_id == tenant_id)
        .options(selectinload(WebsitePage.components))
        .order_by(WebsitePage.sort_order, WebsitePage.title)
    )
    if not include_unpublished:
        query = query.where(WebsitePage.is_published == True)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_page(db: AsyncSession, page_id: str, tenant_id: str) -> WebsitePage | None:
    """Get a page by ID."""
    result = await db.execute(
        select(WebsitePage)
        .where(WebsitePage.id == page_id, WebsitePage.tenant_id == tenant_id)
        .options(selectinload(WebsitePage.components))
    )
    return result.scalar_one_or_none()


async def get_page_by_slug(db: AsyncSession, slug: str, tenant_id: str) -> WebsitePage | None:
    """Get a page by slug."""
    result = await db.execute(
        select(WebsitePage)
        .where(WebsitePage.slug == slug, WebsitePage.tenant_id == tenant_id)
        .options(selectinload(WebsitePage.components))
    )
    return result.scalar_one_or_none()


async def create_page(db: AsyncSession, tenant_id: str, data: dict) -> WebsitePage:
    """Create a new page."""
    # If marking as homepage, unmark others
    if data.get("is_homepage"):
        existing = await db.execute(
            select(WebsitePage).where(
                WebsitePage.tenant_id == tenant_id,
                WebsitePage.is_homepage == True,
            )
        )
        for page in existing.scalars().all():
            page.is_homepage = False

    page = WebsitePage(tenant_id=tenant_id, **data)
    db.add(page)
    await db.flush()
    await db.refresh(page)
    return page


async def update_page(db: AsyncSession, page_id: str, tenant_id: str, data: dict) -> WebsitePage | None:
    """Update a page."""
    page = await get_page(db, page_id, tenant_id)
    if not page:
        return None

    # If marking as homepage, unmark others
    if data.get("is_homepage") and not page.is_homepage:
        existing = await db.execute(
            select(WebsitePage).where(
                WebsitePage.tenant_id == tenant_id,
                WebsitePage.is_homepage == True,
                WebsitePage.id != page_id,
            )
        )
        for p in existing.scalars().all():
            p.is_homepage = False

    for key, value in data.items():
        if value is not None:
            setattr(page, key, value)

    await db.flush()
    await db.refresh(page)
    return page


async def delete_page(db: AsyncSession, page_id: str, tenant_id: str) -> bool:
    """Delete a page and its components."""
    page = await get_page(db, page_id, tenant_id)
    if not page:
        return False

    # Delete components first
    await db.execute(
        delete(WebsiteComponent).where(WebsiteComponent.page_id == page_id)
    )
    await db.delete(page)
    await db.flush()
    return True


# ── Components ───────────────────────────────────────────────

async def add_component(db: AsyncSession, page_id: str, tenant_id: str, data: dict) -> WebsiteComponent | None:
    """Add a component to a page."""
    page = await get_page(db, page_id, tenant_id)
    if not page:
        return None

    component = WebsiteComponent(page_id=page_id, tenant_id=tenant_id, **data)
    db.add(component)
    await db.flush()
    await db.refresh(component)
    return component


async def update_component(db: AsyncSession, component_id: str, tenant_id: str, data: dict) -> WebsiteComponent | None:
    """Update a component."""
    result = await db.execute(
        select(WebsiteComponent).where(
            WebsiteComponent.id == component_id,
            WebsiteComponent.tenant_id == tenant_id,
        )
    )
    component = result.scalar_one_or_none()
    if not component:
        return None

    for key, value in data.items():
        if value is not None:
            setattr(component, key, value)

    await db.flush()
    await db.refresh(component)
    return component


async def delete_component(db: AsyncSession, component_id: str, tenant_id: str) -> bool:
    """Delete a component."""
    result = await db.execute(
        select(WebsiteComponent).where(
            WebsiteComponent.id == component_id,
            WebsiteComponent.tenant_id == tenant_id,
        )
    )
    component = result.scalar_one_or_none()
    if not component:
        return False

    await db.delete(component)
    await db.flush()
    return True


# ── Theme ────────────────────────────────────────────────────

async def get_theme(db: AsyncSession, tenant_id: str) -> WebsiteTheme | None:
    """Get theme for a tenant."""
    result = await db.execute(
        select(WebsiteTheme).where(WebsiteTheme.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def upsert_theme(db: AsyncSession, tenant_id: str, data: dict) -> WebsiteTheme:
    """Create or update theme."""
    theme = await get_theme(db, tenant_id)
    if theme:
        for key, value in data.items():
            if value is not None:
                setattr(theme, key, value)
    else:
        theme = WebsiteTheme(tenant_id=tenant_id, **data)
        db.add(theme)

    await db.flush()
    await db.refresh(theme)
    return theme


# ── Public Site ──────────────────────────────────────────────

async def get_public_site(db: AsyncSession, tenant_id: str) -> dict:
    """Get the full public site for rendering."""
    pages = await list_pages(db, tenant_id, include_unpublished=False)
    theme = await get_theme(db, tenant_id)
    homepage = next((p for p in pages if p.is_homepage), pages[0] if pages else None)

    return {
        "pages": pages,
        "theme": theme,
        "homepage": homepage,
    }
