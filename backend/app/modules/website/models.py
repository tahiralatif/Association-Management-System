"""Website Builder — models for association website pages and components."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WebsitePage(Base):
    """A page on the association's public website."""
    __tablename__ = "website_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_homepage: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    meta_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    components: Mapped[list["WebsiteComponent"]] = relationship(back_populates="page", order_by="WebsiteComponent.sort_order")


class WebsiteComponent(Base):
    """A component/block on a page (hero, text, image, gallery, etc.)."""
    __tablename__ = "website_components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id: Mapped[str] = mapped_column(String(36), ForeignKey("website_pages.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    component_type: Mapped[str] = mapped_column(String(50), comment="hero, text, image, gallery, cta, events, members, custom_html")
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Rich text or HTML content")
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="Component-specific config")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    page: Mapped["WebsitePage"] = relationship(back_populates="components")


class WebsiteTheme(Base):
    """Website theme/branding settings."""
    __tablename__ = "website_themes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#0d9488")
    secondary_color: Mapped[str] = mapped_column(String(7), default="#1e293b")
    accent_color: Mapped[str] = mapped_column(String(7), default="#f59e0b")
    background_color: Mapped[str] = mapped_column(String(7), default="#ffffff")
    text_color: Mapped[str] = mapped_column(String(7), default="#1e293b")
    font_family: Mapped[str] = mapped_column(String(100), default="Inter")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    header_html: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Custom header HTML (analytics, etc.)")
    footer_html: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Custom footer HTML")
    custom_css: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
