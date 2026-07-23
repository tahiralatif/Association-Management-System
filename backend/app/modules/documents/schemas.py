"""Documents schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


# ── Category ─────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    parent_id: str | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    parent_id: str | None = None
    document_count: int
    sort_order: int

    model_config = {"from_attributes": True}


# ── Document ─────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    document_type: str = "file"
    file_name: str | None = None
    file_size: int | None = None
    file_type: str | None = None
    file_url: str | None = None
    storage_path: str | None = None
    link_url: str | None = None
    category_id: str | None = None
    parent_id: str | None = None
    tags: list[str] = []
    access_level: str = "members"
    allowed_user_ids: list[str] = []
    allowed_group_ids: list[str] = []


class DocumentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    category_id: str | None = None
    tags: list[str] | None = None
    access_level: str | None = None
    allowed_user_ids: list[str] | None = None
    allowed_group_ids: list[str] | None = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    slug: str
    description: str | None = None
    document_type: str
    status: str
    file_name: str | None = None
    file_size: int | None = None
    file_type: str | None = None
    file_url: str | None = None
    thumbnail_url: str | None = None
    link_url: str | None = None
    version: int
    category_id: str | None = None
    tags: list[str] = []
    access_level: str
    view_count: int
    download_count: int
    published_at: datetime | None = None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpload(BaseModel):
    """For generating presigned upload URL."""
    file_name: str
    file_type: str
    file_size: int


class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_url: str
    storage_path: str
    expires_in: int


# ── Version ──────────────────────────────────────────────────

class VersionUpload(BaseModel):
    file_name: str
    file_size: int
    file_url: str
    storage_path: str
    change_summary: str | None = None


class VersionResponse(BaseModel):
    id: str
    version: int
    file_name: str
    file_size: int
    file_url: str
    change_summary: str | None = None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Comment ──────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    parent_id: str | None = None


class CommentResponse(BaseModel):
    id: str
    document_id: str
    member_id: str
    content: str
    parent_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Share ────────────────────────────────────────────────────

class ShareCreate(BaseModel):
    user_id: str
    permission: str = "view"  # view, edit
    expires_at: datetime | None = None


class ShareResponse(BaseModel):
    id: str
    document_id: str
    shared_with: str
    permission: str
    expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ────────────────────────────────────────────────

class DocumentStats(BaseModel):
    total_documents: int
    total_views: int
    total_downloads: int
    total_size: int  # bytes
    recent_documents: list[dict] = []
    top_categories: list[dict] = []
    storage_breakdown: dict[str, int] = {}
