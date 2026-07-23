"""SMTP email provider — sends via standard SMTP (Gmail, etc.)."""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .base import EmailMessage, EmailProvider, EmailResult

log = logging.getLogger(__name__)


class SMTPEmailProvider(EmailProvider):
    """Send emails via SMTP with STARTTLS."""

    def __init__(
        self,
        host: str,
        port: int = 587,
        username: str = "",
        password: str = "",
        from_email: str = "",
        from_name: str = "",
        use_tls: bool = True,
        timeout: int = 30,
    ):
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._from_email = from_email
        self._from_name = from_name
        self._use_tls = use_tls
        self._timeout = timeout

    @property
    def name(self) -> str:
        return "smtp"

    def _build_from(self, message: EmailMessage) -> str:
        """Build the From header."""
        name = message.from_name or self._from_name
        email = message.from_email or self._from_email
        if name:
            return f"{name} <{email}>"
        return email

    def _build_mime(self, message: EmailMessage) -> MIMEMultipart:
        """Convert EmailMessage to MIME."""
        msg = MIMEMultipart("alternative")
        msg["From"] = self._build_from(message)
        msg["To"] = message.to
        msg["Subject"] = message.subject

        if message.reply_to:
            msg["Reply-To"] = message.reply_to
        if message.cc:
            msg["Cc"] = ", ".join(message.cc)

        # Custom headers (e.g. X-Campaign-Id)
        for key, value in message.headers.items():
            msg[key] = value

        # Attach bodies
        if message.text_body:
            msg.attach(MIMEText(message.text_body, "plain"))
        msg.attach(MIMEText(message.html_body, "html"))

        return msg

    async def send(self, message: EmailMessage) -> EmailResult:
        """Send email via SMTP (sync, run in executor if needed)."""
        try:
            mime = self._build_mime(message)

            # Build recipient list
            recipients = [message.to] + message.cc + message.bcc

            with smtplib.SMTP(self._host, self._port, timeout=self._timeout) as server:
                if self._use_tls:
                    server.starttls()
                if self._username:
                    server.login(self._username, self._password)
                server.sendmail(
                    self._build_from(message),
                    recipients,
                    mime.as_string(),
                )

            log.info("Email sent via SMTP: to=%s subject=%s", message.to, message.subject)
            return EmailResult.success(provider=self.name)

        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {e}"
            log.error(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

        except smtplib.SMTPRecipientsRefused as e:
            error_msg = f"All recipients refused: {e}"
            log.error(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {e}"
            log.error(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

        except ConnectionRefusedError as e:
            error_msg = f"SMTP connection refused ({self._host}:{self._port}): {e}"
            log.error(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

        except OSError as e:
            error_msg = f"SMTP network error: {e}"
            log.error(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

        except Exception as e:
            error_msg = f"Unexpected email error: {type(e).__name__}: {e}"
            log.exception(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

    async def health_check(self) -> bool:
        """Check SMTP connectivity."""
        try:
            with smtplib.SMTP(self._host, self._port, timeout=10) as server:
                if self._use_tls:
                    server.starttls()
                if self._username:
                    server.login(self._username, self._password)
            return True
        except Exception:
            return False
