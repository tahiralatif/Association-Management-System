"""Email provider abstraction layer.

Provides a provider-independent interface for sending emails.
Current implementation: Gmail SMTP.
Swap providers by changing EMAIL_PROVIDER env var and adding new provider class.
"""

from .base import EmailProvider, EmailMessage, EmailResult
from .factory import get_email_provider

__all__ = ["EmailProvider", "EmailMessage", "EmailResult", "get_email_provider"]
