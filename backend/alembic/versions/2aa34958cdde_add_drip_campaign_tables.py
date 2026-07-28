"""Add drip campaign tables

Revision ID: 2aa34958cdde
Revises: c8204ffa6ca3
Create Date: 2026-07-28 06:19:48.818484
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2aa34958cdde'
down_revision: Union[str, None] = 'c8204ffa6ca3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drip Campaign
    op.create_table('drip_campaigns',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('tenant_id', sa.String(64), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trigger_event', sa.String(50), nullable=False, server_default='manual'),
        sa.Column('target_segments', sa.JSON(), nullable=True),
        sa.Column('target_group_ids', sa.JSON(), nullable=True),
        sa.Column('target_all', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('total_enrolled', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_unsubscribed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('from_name', sa.String(100), nullable=False),
        sa.Column('from_email', sa.String(200), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_drip_campaigns_tenant_id', 'drip_campaigns', ['tenant_id'])

    # Drip Steps
    op.create_table('drip_steps',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('tenant_id', sa.String(64), nullable=False),
        sa.Column('campaign_id', sa.String(36), nullable=False),
        sa.Column('step_order', sa.Integer(), nullable=False),
        sa.Column('step_type', sa.String(20), nullable=False, server_default='email'),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('html_body', sa.Text(), nullable=True),
        sa.Column('plain_body', sa.Text(), nullable=True),
        sa.Column('delay_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('delay_hours', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('condition_type', sa.String(50), nullable=True),
        sa.Column('condition_value', sa.String(200), nullable=True),
        sa.Column('condition_branch_true', sa.Integer(), nullable=True),
        sa.Column('condition_branch_false', sa.Integer(), nullable=True),
        sa.Column('sent_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('opened_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('clicked_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['drip_campaigns.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_drip_steps_tenant_id', 'drip_steps', ['tenant_id'])
    op.create_index('ix_drip_steps_campaign_id', 'drip_steps', ['campaign_id'])

    # Drip Enrollments
    op.create_table('drip_enrollments',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('tenant_id', sa.String(64), nullable=False),
        sa.Column('campaign_id', sa.String(36), nullable=False),
        sa.Column('member_id', sa.String(36), nullable=False),
        sa.Column('current_step_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('next_send_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('unsubscribed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['drip_campaigns.id']),
        # Note: member_id references users.id but users.id is UUID type;
        # FK constraint omitted to avoid type mismatch with VARCHAR member_id
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_drip_enrollments_tenant_id', 'drip_enrollments', ['tenant_id'])
    op.create_index('ix_drip_enrollments_campaign_id', 'drip_enrollments', ['campaign_id'])
    op.create_index('ix_drip_enrollments_member_id', 'drip_enrollments', ['member_id'])

    # Drip Logs
    op.create_table('drip_logs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('tenant_id', sa.String(64), nullable=False),
        sa.Column('enrollment_id', sa.String(36), nullable=False),
        sa.Column('step_id', sa.String(36), nullable=False),
        sa.Column('campaign_id', sa.String(36), nullable=False),
        sa.Column('member_id', sa.String(36), nullable=False),
        sa.Column('action', sa.String(30), nullable=False),
        sa.Column('tracking_id', sa.String(100), nullable=True),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['drip_campaigns.id']),
        sa.ForeignKeyConstraint(['enrollment_id'], ['drip_enrollments.id']),
        sa.ForeignKeyConstraint(['step_id'], ['drip_steps.id']),
        # Note: member_id FK omitted — users.id is UUID type
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_drip_logs_tenant_id', 'drip_logs', ['tenant_id'])
    op.create_index('ix_drip_logs_enrollment_id', 'drip_logs', ['enrollment_id'])


def downgrade() -> None:
    op.drop_index('ix_drip_logs_enrollment_id', table_name='drip_logs')
    op.drop_index('ix_drip_logs_tenant_id', table_name='drip_logs')
    op.drop_table('drip_logs')
    op.drop_index('ix_drip_enrollments_member_id', table_name='drip_enrollments')
    op.drop_index('ix_drip_enrollments_campaign_id', table_name='drip_enrollments')
    op.drop_index('ix_drip_enrollments_tenant_id', table_name='drip_enrollments')
    op.drop_table('drip_enrollments')
    op.drop_index('ix_drip_steps_campaign_id', table_name='drip_steps')
    op.drop_index('ix_drip_steps_tenant_id', table_name='drip_steps')
    op.drop_table('drip_steps')
    op.drop_index('ix_drip_campaigns_tenant_id', table_name='drip_campaigns')
    op.drop_table('drip_campaigns')
