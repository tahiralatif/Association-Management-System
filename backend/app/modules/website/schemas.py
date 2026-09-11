"""Website Builder — Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


# ── Page Schemas ─────────────────────────────────────────────

class PageCreate(BaseModel):
    title: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=200)
    description: str | None = None
    is_published: bool = False
    is_homepage: bool = False
    meta_title: str | None = None
    meta_description: str | None = None


class PageUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    description: str | None = None
    is_published: bool | None = None
    is_homepage: bool | None = None
    sort_order: int | None = None
    meta_title: str | None = None
    meta_description: str | None = None


class ComponentCreate(BaseModel):
    component_type: str = Field(..., description="hero, text, image, gallery, cta, events, members, custom_html")
    title: str | None = None
    content: str | None = None
    image_url: str | None = None
    settings: dict | None = None
    sort_order: int = 0
    is_visible: bool = True


class ComponentUpdate(BaseModel):
    component_type: str | None = None
    title: str | None = None
    content: str | None = None
    image_url: str | None = None
    settings: dict | None = None
    sort_order: int | None = None
    is_visible: bool | None = None


class ComponentResponse(BaseModel):
    id: str
    component_type: str
    title: str | None = None
    content: str | None = None
    image_url: str | None = None
    settings: dict | None = None
    sort_order: int
    is_visible: bool

    model_config = {"from_attributes": True}


class PageResponse(BaseModel):
    id: str
    title: str
    slug: str
    description: str | None = None
    is_published: bool
    is_homepage: bool
    sort_order: int
    meta_title: str | None = None
    meta_description: str | None = None
    components: list[ComponentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PageListResponse(BaseModel):
    pages: list[PageResponse]
    total: int


# ── Theme Schemas ────────────────────────────────────────────

class ThemeUpdate(BaseModel):
    primary_color: str | None = None
    secondary_color: str | None = None
    accent_color: str | None = None
    background_color: str | None = None
    text_color: str | None = None
    font_family: str | None = None
    logo_url: str | None = None
    favicon_url: str | None = None
    header_html: str | None = None
    footer_html: str | None = None
    custom_css: str | None = None


class ThemeResponse(BaseModel):
    id: str
    tenant_id: str
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    font_family: str
    logo_url: str | None = None
    favicon_url: str | None = None
    header_html: str | None = None
    footer_html: str | None = None
    custom_css: str | None = None

    model_config = {"from_attributes": True}


# ── Public Site ──────────────────────────────────────────────

class PublicPageResponse(BaseModel):
    """Public-facing page (no unpublished pages)."""
    title: str
    slug: str
    description: str | None = None
    components: list[ComponentResponse] = []
    meta_title: str | None = None
    meta_description: str | None = None


class PublicSiteResponse(BaseModel):
    """Full public site data."""
    organization_name: str
    theme: ThemeResponse | None = None
    pages: list[PublicPageResponse] = []
    homepage: PublicPageResponse | None = None
