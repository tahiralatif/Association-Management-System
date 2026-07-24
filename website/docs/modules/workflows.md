---
sidebar_position: 12
title: Workflows
---

# Workflows Module

Visual automation builder with 12+ action types and intelligent triggers.

## Features

- **Visual Builder:** Drag-and-drop workflow creation
- **12+ Action Types:** Email, member updates, events, delays, webhooks, AI analysis
- **Triggers:** Manual, event-based, time-based, API-triggered
- **Conditions:** If/else branching, member attributes, date comparisons
- **Delays:** Wait steps (hours, days, weeks)
- **Run History:** Full execution log with status and timing
- **Templates:** Pre-built workflow templates
- **Error Handling:** Retry logic, failure notifications

## Action Types

| Action | Description |
|---|---|
| `send_email` | Send email to member(s) |
| `update_member` | Update member fields |
| `create_event` | Create a new event |
| `add_to_group` | Add member to a group |
| `remove_from_group` | Remove member from a group |
| `add_tag` | Add tag to member |
| `remove_tag` | Remove tag from member |
| `create_invoice` | Generate an invoice |
| `wait` | Delay for specified duration |
| `condition` | Branch based on conditions |
| `webhook` | Call external API |
| `ai_analysis` | Run AI analysis on member |
| `notify_admin` | Send admin notification |
| `generate_report` | Generate a report |

## API Endpoints (11 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/workflows/` | List workflows | Staff+ |
| `POST` | `/workflows/` | Create workflow | Staff+ |
| `GET` | `/workflows/stats` | Workflow statistics | Staff+ |
| `GET` | `/workflows/{id}` | Get workflow details | Staff+ |
| `PUT` | `/workflows/{id}` | Update workflow | Staff+ |
| `DELETE` | `/workflows/{id}` | Delete workflow | Admin |
| `POST` | `/workflows/{id}/activate` | Activate workflow | Staff+ |
| `POST` | `/workflows/{id}/deactivate` | Pause workflow | Staff+ |
| `POST` | `/workflows/{id}/trigger` | Manually trigger | Staff+ |
| `GET` | `/workflows/{id}/runs` | View execution history | Staff+ |
| `GET` | `/workflows/templates` | List templates | Staff+ |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List workflows
curl -s "$API/workflows/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List workflow templates
curl -s "$API/workflows/templates" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Workflows](../testing/workflows.md) for complete test scripts.
