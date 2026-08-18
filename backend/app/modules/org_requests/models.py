"""Organization Request model — pending org registrations awaiting admin approval."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


# Status values (plain strings to avoid PostgreSQL enum case issues)
PENDING = "pending"
APPROVED = "approved"
REJECTED = "rejected"


class OrganizationRequest(Base):
    """A pending request to create a new organization/tenant."""

    __tablename__ = "organization_requests"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # Applicant info
    org_name: Mapped[str] = mapped_column(String(256), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(256), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(String(512), nullable=True)
    expected_members: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(32),
        default=PENDING,
        nullable=False,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Set on approval
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)

    # Review
    reviewed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Magic link token for admin account setup
    setup_token: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True, index=True)
    setup_token_used: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<OrganizationRequest {self.org_name} ({self.status.value})>"
