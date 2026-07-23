"""Base email provider interface — all providers implement this."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class EmailStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"
    RETRYING = "retrying"


@dataclass
class EmailMessage:
    """Unified email message structure — provider-independent."""
    to: str
    subject: str
    html_body: str
    text_body: str | None = None
    from_email: str | None = None
    from_name: str | None = None
    reply_to: str | None = None
    cc: list[str] = field(default_factory=list)
    bcc: list[str] = field(default_factory=list)
    tags: dict[str, str] = field(default_factory=dict)  # For tracking (campaign_id, template_id, etc.)
    headers: dict[str, str] = field(default_factory=dict)


@dataclass
class EmailResult:
    """Result of an email send attempt."""
    status: EmailStatus
    provider: str
    provider_message_id: str | None = None
    error: str | None = None
    retry_count: int = 0
    sent_at: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def success(cls, provider: str, message_id: str | None = None) -> EmailResult:
        return cls(
            status=EmailStatus.SENT,
            provider=provider,
            provider_message_id=message_id,
            sent_at=datetime.now(timezone.utc),
        )

    @classmethod
    def failure(cls, provider: str, error: str, retry_count: int = 0) -> EmailResult:
        return cls(
            status=EmailStatus.FAILED,
            provider=provider,
            error=error,
            retry_count=retry_count,
            sent_at=datetime.now(timezone.utc),
        )


class EmailProvider(abc.ABC):
    """Abstract base class for email providers."""

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Provider name for logging (e.g. 'smtp', 'sendgrid', 'ses')."""
        ...

    @abc.abstractmethod
    async def send(self, message: EmailMessage) -> EmailResult:
        """Send an email. Returns EmailResult with status."""
        ...

    @abc.abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is reachable and configured."""
        ...
