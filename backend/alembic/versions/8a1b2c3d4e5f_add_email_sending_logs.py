"""Add email_sending_logs table for detailed email send tracking with retry info.

Revision ID: 8a1b2c3d4e5f
Revises: 733cc2117d46
Create Date: 2026-07-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "8a1b2c3d4e5f"
down_revision = "733cc2117d46"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_sending_logs",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False, index=True),
        sa.Column("recipient_id", UUID(as_uuid=False), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("recipient_email", sa.String(200), nullable=False, index=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_preview", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("provider", sa.String(50), nullable=False, server_default="smtp"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("template_id", UUID(as_uuid=False), sa.ForeignKey("email_templates.id"), nullable=True),
        sa.Column("campaign_id", UUID(as_uuid=False), sa.ForeignKey("email_campaigns.id"), nullable=True),
        sa.Column("retry_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("max_retries", sa.Integer, nullable=False, server_default="3"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Composite index for common admin queries
    op.create_index("ix_email_sending_logs_tenant_status", "email_sending_logs", ["tenant_id", "status"])
    op.create_index("ix_email_sending_logs_created_at", "email_sending_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_email_sending_logs_created_at")
    op.drop_index("ix_email_sending_logs_tenant_status")
    op.drop_table("email_sending_logs")
