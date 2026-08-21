"""Organization (tenant) model — public-facing registry for multi-tenant routing."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Boolean, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Organization(Base):
    """A registered association/organization. Each tenant_id maps to one org."""

    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    slug: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False,
        doc="URL-friendly identifier, e.g. 'demo-association'",
    )
    name: Mapped[str] = mapped_column(
        String(256), nullable=False,
        doc="Display name of the organization",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    website: Mapped[str | None] = mapped_column(String(512), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(256), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tenant_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False,
        doc="Maps to tenant_id used throughout the system",
    )

    # ── Public profile fields ──────────────────────────────────────────
    tagline: Mapped[str | None] = mapped_column(
        String(256), nullable=True,
        doc="Short one-liner under the org name, e.g. 'Building community since 2010'",
    )
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_image: Mapped[str | None] = mapped_column(
        String(1024), nullable=True,
        doc="Hero/banner image URL for the public profile page",
    )
    about_html: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        doc="Rich HTML/markdown 'About Us' content",
    )
    social_links: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        doc="JSON object: {twitter, facebook, instagram, linkedin}",
    )
    join_cta_text: Mapped[str | None] = mapped_column(
        String(128), nullable=True, default="Join Us",
        doc="Label for the Join button, e.g. 'Become a Member'",
    )
    join_cta_url: Mapped[str | None] = mapped_column(
        String(1024), nullable=True,
        doc="Where the Join button links. If null, defaults to /register?org={slug}",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<Organization {self.slug} ({self.name})>"
