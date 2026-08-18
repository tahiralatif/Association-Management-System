"""Resend email provider — reliable transactional email.

Free tier: 100 emails/day, 3000/month.
Supports custom domains with DKIM/SPF/DMARC for maximum deliverability.
No spam folder issues.
"""

from __future__ import annotations

import logging
import urllib.request
import json

from .base import EmailMessage, EmailProvider, EmailResult

log = logging.getLogger(__name__)


class ResendEmailProvider(EmailProvider):
    """Send emails via Resend API (https://resend.com)."""

    def __init__(self, api_key: str, from_email: str = "", from_name: str = ""):
        self._api_key = api_key
        self._from_email = from_email
        self._from_name = from_name

    @property
    def name(self) -> str:
        return "resend"

    async def send(self, message: EmailMessage) -> EmailResult:
        """Send email via Resend API."""
        try:
            from_email = message.from_email or self._from_email
            from_name = message.from_name or self._from_name
            if from_name:
                from_field = f"{from_name} <{from_email}>"
            else:
                from_field = from_email

            payload = {
                "from": from_field,
                "to": [message.to],
                "subject": message.subject,
                "html": message.html_body,
            }
            if message.text_body:
                payload["text"] = message.text_body
            if message.reply_to:
                payload["reply_to"] = [message.reply_to]
            if message.cc:
                payload["cc"] = message.cc
            if message.bcc:
                payload["bcc"] = message.bcc

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=data,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode())
                message_id = body.get("id", "")

            log.info("Email sent via Resend: to=%s subject=%s id=%s", message.to, message.subject, message_id)
            return EmailResult.success(provider=self.name, message_id=message_id)

        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode()
            except Exception:
                pass
            error_msg = f"Resend API error {e.code}: {error_body}"
            log.error(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

        except Exception as e:
            error_msg = f"Resend error: {type(e).__name__}: {e}"
            log.exception(error_msg)
            return EmailResult.failure(provider=self.name, error=error_msg)

    async def health_check(self) -> bool:
        """Check Resend API connectivity."""
        try:
            req = urllib.request.Request(
                "https://api.resend.com/domains",
                headers={"Authorization": f"Bearer {self._api_key}"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception:
            return False
