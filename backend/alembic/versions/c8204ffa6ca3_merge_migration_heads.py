"""Merge migration heads

Revision ID: c8204ffa6ca3
Revises: 8a1b2c3d4e5f, b1a2c3d4e5f6
Create Date: 2026-07-28 06:19:38.429335
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8204ffa6ca3'
down_revision: Union[str, None] = ('8a1b2c3d4e5f', 'b1a2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
