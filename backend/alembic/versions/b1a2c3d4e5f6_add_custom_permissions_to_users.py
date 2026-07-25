"""add custom_permissions column to users for RBAC

Revision ID: b1a2c3d4e5f6
Revises: 733cc2117d46
Create Date: 2026-07-25 06:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b1a2c3d4e5f6"
down_revision: Union[str, None] = "733cc2117d46"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions TEXT[]"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS custom_permissions")
