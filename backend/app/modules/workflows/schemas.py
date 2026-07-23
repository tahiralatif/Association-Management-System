"""Workflows schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Workflow ─────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    trigger_type: str = "manual"
    trigger_config: dict = {}
    steps: list[dict] = []


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    trigger_type: str | None = None
    trigger_config: dict | None = None
    steps: list[dict] | None = None


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: str
    trigger_type: str
    trigger_config: dict = {}
    steps: list[dict] = []
    total_runs: int
    successful_runs: int
    failed_runs: int
    last_run_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Step Builder ─────────────────────────────────────────────

class WorkflowStep(BaseModel):
    type: str  # send_email, send_notification, condition, wait, update_member, etc.
    config: dict = {}
    next_step: int | None = None  # for conditional branching
    condition: dict | None = None  # {"field": "...", "operator": "equals", "value": "..."}


# ── Run ──────────────────────────────────────────────────────

class WorkflowRunResponse(BaseModel):
    id: str
    workflow_id: str
    status: str
    current_step: int
    total_steps: int
    trigger_data: dict = {}
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowRunDetail(WorkflowRunResponse):
    step_results: list[dict] = []
    context: dict = {}


# ── Action Template ──────────────────────────────────────────

class ActionTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    action_type: str
    config: dict = {}
    description: str | None = None


class ActionTemplateResponse(BaseModel):
    id: str
    name: str
    action_type: str
    config: dict
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Stats ────────────────────────────────────────────────────

class WorkflowStats(BaseModel):
    total_workflows: int
    active_workflows: int
    total_runs_today: int
    success_rate: float
    average_execution_time: float
    recent_runs: list[dict] = []
    top_workflows: list[dict] = []
