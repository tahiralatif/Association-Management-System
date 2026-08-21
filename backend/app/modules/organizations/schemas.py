"""Organization profile schemas."""

from pydantic import BaseModel


class OrgProfileUpdate(BaseModel):
    """Partial update schema for org public profile."""
    description: str | None = None
    tagline: str | None = None
    logo_url: str | None = None
    hero_image: str | None = None
    website: str | None = None
    contact_email: str | None = None
    phone: str | None = None
    address: str | None = None
    about_html: str | None = None
    social_links: dict | None = None
    join_cta_text: str | None = None
    join_cta_url: str | None = None
