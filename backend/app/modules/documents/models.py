"""Documents models — file management, versioning, categories."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text, Integer, JSON, Boolean, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class DocumentType(str, enum.Enum):
    FILE = "FILE"
    FOLDER = "FOLDER"
    LINK = "LINK"
    POLICY = "POLICY"
    BYLAWS = "BYLAWS"
    MINUTES = "MINUTES"
    RESOLUTION = "RESOLUTION"
    REPORT = "REPORT"
    FORM = "FORM"
    OTHER = "OTHER"


class AccessLevel(str, enum.Enum):
    PUBLIC = "public"
    MEMBERS = "members"
    STAFF = "staff"
    ADMIN = "admin"
    RESTRICTED = "restricted"


# ── Document Category ────────────────────────────────────────

class DocumentCategory(Base):
    __tablename__ = "document_categories"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(7))
    parent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("document_categories.id"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    document_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Document ─────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    title: Mapped[str] = mapped_column(String(300))
    slug: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), default=DocumentType.FILE)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.DRAFT)

    # File info
    file_name: Mapped[str | None] = mapped_column(String(300))
    file_size: Mapped[int | None] = mapped_column(Integer)  # bytes
    file_type: Mapped[str | None] = mapped_column(String(50))  # mime type
    file_url: Mapped[str | None] = mapped_column(String(500))
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    storage_path: Mapped[str | None] = mapped_column(String(500))

    # For links
    link_url: Mapped[str | None] = mapped_column(String(500))

    # Versioning
    version: Mapped[int] = mapped_column(Integer, default=1)
    current_version_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))

    # Organization
    category_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("document_categories.id"), index=True)
    parent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("documents.id"))
    tags: Mapped[list | None] = mapped_column(JSON, default=[])

    # Access control
    access_level: Mapped[AccessLevel] = mapped_column(Enum(AccessLevel), default=AccessLevel.MEMBERS)
    allowed_user_ids: Mapped[list | None] = mapped_column(JSON, default=[])
    allowed_group_ids: Mapped[list | None] = mapped_column(JSON, default=[])

    # Metadata
    metadata_json: Mapped[dict | None] = mapped_column(JSON, default={})
    search_text: Mapped[str | None] = mapped_column(Text)  # for full-text search

    # Stats
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    download_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    versions: Mapped[list["DocumentVersion"]] = relationship(back_populates="document")
    comments: Mapped[list["DocumentComment"]] = relationship(back_populates="document")
    activity_logs: Mapped[list["DocumentActivity"]] = relationship(back_populates="document")


# ── Document Version ─────────────────────────────────────────

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("documents.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    version: Mapped[int] = mapped_column(Integer)
    file_name: Mapped[str] = mapped_column(String(300))
    file_size: Mapped[int] = mapped_column(Integer)
    file_url: Mapped[str] = mapped_column(String(500))
    storage_path: Mapped[str] = mapped_column(String(500))

    change_summary: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="versions")


# ── Document Comment ─────────────────────────────────────────

class DocumentComment(Base):
    __tablename__ = "document_comments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("documents.id"), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    content: Mapped[str] = mapped_column(Text)
    parent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("document_comments.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="comments")


# ── Document Share ───────────────────────────────────────────

class DocumentShare(Base):
    __tablename__ = "document_shares"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("documents.id"), index=True)
    shared_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    shared_with: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    permission: Mapped[str] = mapped_column(String(20), default="view")  # view, edit, admin
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Document Activity Log ────────────────────────────────────

class DocumentActivity(Base):
    __tablename__ = "document_activities"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("documents.id"), index=True)
    member_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("member_profiles.id"))
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)

    action: Mapped[str] = mapped_column(String(50))  # view, download, edit, comment, share
    details: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="activity_logs")
