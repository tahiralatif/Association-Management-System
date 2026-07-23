"""Report export service — generate PDF/Excel reports from analytics data."""

from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timezone

log = logging.getLogger(__name__)


def export_members_csv(members: list[dict]) -> str:
    """Export members list to CSV string."""
    if not members:
        return ""
    output = io.StringIO()
    # Flatten member data
    fieldnames = [
        "email", "first_name", "last_name", "member_number",
        "tier", "status", "joined_at", "expires_at", "engagement_score",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for m in members:
        row = {
            "email": m.get("email", ""),
            "first_name": m.get("first_name", ""),
            "last_name": m.get("last_name", ""),
            "member_number": m.get("member_number", ""),
            "tier": m.get("tier", ""),
            "status": m.get("status", ""),
            "joined_at": m.get("joined_at", ""),
            "expires_at": m.get("expires_at", ""),
            "engagement_score": m.get("engagement_score", ""),
        }
        writer.writerow(row)
    return output.getvalue()


def export_financial_report_csv(payments: list[dict], invoices: list[dict]) -> str:
    """Export financial report as CSV."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Type", "Date", "Description", "Amount", "Status", "Reference"])

    for p in payments:
        writer.writerow([
            "Payment",
            p.get("paid_at", ""),
            f"Invoice {p.get('invoice_id', '')[:8]}",
            p.get("amount", 0),
            p.get("status", ""),
            p.get("reference_number", ""),
        ])

    for inv in invoices:
        writer.writerow([
            "Invoice",
            inv.get("issued_at", ""),
            inv.get("invoice_number", ""),
            inv.get("total", 0),
            inv.get("status", ""),
            "",
        ])

    return output.getvalue()


def export_event_report_csv(registrations: list[dict]) -> str:
    """Export event attendance report as CSV."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Member", "Email", "Event", "Status", "Registered", "Checked In"])

    for r in registrations:
        writer.writerow([
            r.get("member_name", ""),
            r.get("member_email", ""),
            r.get("event_title", ""),
            r.get("status", ""),
            r.get("created_at", ""),
            r.get("checked_in_at", ""),
        ])

    return output.getvalue()


def generate_html_report(title: str, sections: list[dict]) -> str:
    """Generate a simple HTML report for PDF conversion.

    sections: [{"heading": str, "content": str, "table": [[str]]}]
    """
    html_parts = [
        "<!DOCTYPE html>",
        "<html><head>",
        f"<title>{title}</title>",
        "<style>",
        "body { font-family: Arial, sans-serif; margin: 40px; }",
        "h1 { color: #333; }",
        "h2 { color: #555; margin-top: 30px; }",
        "table { border-collapse: collapse; width: 100%; margin: 15px 0; }",
        "th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }",
        "th { background-color: #f2f2f2; }",
        ".metric { font-size: 24px; font-weight: bold; color: #2563eb; }",
        ".section { margin-bottom: 20px; }",
        "</style>",
        "</head><body>",
        f"<h1>{title}</h1>",
        f"<p>Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}</p>",
    ]

    for section in sections:
        html_parts.append(f"<h2>{section.get('heading', '')}</h2>")
        if section.get("content"):
            html_parts.append(f"<p>{section['content']}</p>")
        if section.get("table"):
            html_parts.append("<table>")
            for i, row in enumerate(section["table"]):
                tag = "th" if i == 0 else "td"
                html_parts.append("<tr>")
                for cell in row:
                    html_parts.append(f"<{tag}>{cell}</{tag}>")
                html_parts.append("</tr>")
            html_parts.append("</table>")
        if section.get("metrics"):
            for key, value in section["metrics"].items():
                html_parts.append(f'<div class="section"><span class="metric">{value}</span> {key}</div>')

    html_parts.extend(["</body></html>"])
    return "\n".join(html_parts)
