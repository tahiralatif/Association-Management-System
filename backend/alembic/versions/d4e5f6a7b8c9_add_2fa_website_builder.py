"""Add 2FA fields, website builder tables, and backup infrastructure.

Revision ID: d4e5f6a7b8c9
Revises: c8204ffa6ca3
Create Date: 2026-09-11
"""

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c8204ffa6ca3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 2FA fields on users table ────────────────────────────
    op.add_column("users", sa.Column("totp_secret", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("totp_secret_pending", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("totp_enabled_at", sa.DateTime(timezone=True), nullable=True))

    # ── Website Builder tables ───────────────────────────────
    op.create_table(
        "website_pages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(64), index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(200), index=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_published", sa.Boolean, default=False),
        sa.Column("is_homepage", sa.Boolean, default=False),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.Column("meta_title", sa.String(200), nullable=True),
        sa.Column("meta_description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "website_components",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("page_id", sa.String(36), sa.ForeignKey("website_pages.id"), index=True),
        sa.Column("tenant_id", sa.String(64), index=True),
        sa.Column("component_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("settings", sa.JSON, nullable=True),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.Column("is_visible", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "website_themes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(64), unique=True, index=True),
        sa.Column("primary_color", sa.String(7), default="#0d9488"),
        sa.Column("secondary_color", sa.String(7), default="#1e293b"),
        sa.Column("accent_color", sa.String(7), default="#f59e0b"),
        sa.Column("background_color", sa.String(7), default="#ffffff"),
        sa.Column("text_color", sa.String(7), default="#1e293b"),
        sa.Column("font_family", sa.String(100), default="Inter"),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("favicon_url", sa.String(500), nullable=True),
        sa.Column("header_html", sa.Text, nullable=True),
        sa.Column("footer_html", sa.Text, nullable=True),
        sa.Column("custom_css", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("website_themes")
    op.drop_table("website_components")
    op.drop_table("website_pages")
    op.drop_column("users", "totp_enabled_at")
    op.drop_column("users", "totp_secret_pending")
    op.drop_column("users", "totp_secret")
