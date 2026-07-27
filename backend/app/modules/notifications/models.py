"""Notification model."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id = Mapped[str] = mapped_column(String(64), index=True)
    user_id = Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    title = Mapped[str] = mapped_column(String(200))
    message = Mapped[str] = mapped_column(Text)
    link = Mapped[str | None] = mapped_column(String(500), nullable=True)
    notification_type = Mapped[str] = mapped_column(String(50))
    is_read = Mapped[bool] = mapped_column(Boolean, default=False)
    read_at = Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at = Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
