"""Workflows models — automation, triggers, actions, business processes."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Integer, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WorkflowStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class TriggerType(str, enum.Enum):
    MEMBER_JOIN = "member_join"
    MEMBER_RENEWAL = "member_renewal"
    MEMBER_EXPIRY = "member_expiry"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_OVERDUE = "payment_overdue"
    EVENT_REGISTRATION = "event_registration"
    EVENT_REMINDER = "event_reminder"
    FORM_SUBMISSION = "form_submission"
    DOCUMENT_UPLOAD = "document_upload"
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    WEBHOOK = "webhook"


class ActionType(str, enum.Enum):
    SEND_EMAIL = "send_email"
    SEND_NOTIFICATION = "send_notification"
    SEND_SMS = "send_sms"
    UPDATE_MEMBER = "update_member"
    CREATE_TASK = "create_task"
    ADD_TO_GROUP = "add_to_group"
    REMOVE_FROM_GROUP = "remove_from_group"
    CREATE_INVOICE = "create_invoice"
    GENERATE_REPORT = "generate_report"
    WAIT = "wait"
    CONDITION = "condition"
    WEBHOOK_CALL = "webhook_call"
    AI_ACTION = "ai_action"


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    WAITING = "waiting"
    CANCELLED = "cancelled"


# ── Workflow ─────────────────────────────────────────────────

class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[WorkflowStatus] = mapped_column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT)

    # Trigger config
    trigger_type: Mapped[TriggerType] = mapped_column(Enum(TriggerType), default=TriggerType.MANUAL)
    trigger_config: Mapped[dict | None] = mapped_column(JSON, default={})

    # Steps definition (JSON array of action configs)
    steps: Mapped[list] = mapped_column(JSON, default=[])
    # Example: [
    #   {"type": "condition", "field": "membership_status", "operator": "equals", "value": "active"},
    #   {"type": "send_email", "template_id": "welcome", "to": "{{member.email}}"},
    #   {"type": "wait", "duration_days": 7},
    #   {"type": "send_email", "template_id": "followup"}
    # ]

    # Execution
    total_runs: Mapped[int] = mapped_column(Integer, default=0)
    successful_runs: Mapped[int] = mapped_column(Integer, default=0)
    failed_runs: Mapped[int] = mapped_column(Integer, default=0)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    runs: Mapped[list["WorkflowRun"]] = relationship(back_populates="workflow")


# ── Workflow Action Template ─────────────────────────────────

class WorkflowActionTemplate(Base):
    """Reusable action templates (e.g., email templates for workflows)."""
    __tablename__ = "workflow_action_templates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    action_type: Mapped[ActionType] = mapped_column(Enum(ActionType))
    config: Mapped[dict] = mapped_column(JSON, default={})
    description: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Workflow Run ─────────────────────────────────────────────

class WorkflowRun(Base):
    """Instance of a workflow execution."""
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workflows.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    status: Mapped[RunStatus] = mapped_column(Enum(RunStatus), default=RunStatus.PENDING)
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    total_steps: Mapped[int] = mapped_column(Integer, default=0)

    # Context data (member_id, event_id, etc.)
    trigger_data: Mapped[dict | None] = mapped_column(JSON, default={})
    context: Mapped[dict | None] = mapped_column(JSON, default={})

    # Results
    step_results: Mapped[list | None] = mapped_column(JSON, default=[])
    error_message: Mapped[str | None] = mapped_column(Text)
    error_step: Mapped[int | None] = mapped_column(Integer)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    workflow: Mapped["Workflow"] = relationship(back_populates="runs")


# ── Workflow Delay ───────────────────────────────────────────

class WorkflowDelay(Base):
    """Pending wait steps in workflows."""
    __tablename__ = "workflow_delays"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workflows.id"), index=True)
    run_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("workflow_runs.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    step_index: Mapped[int] = mapped_column(Integer)
    resume_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_resumed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
