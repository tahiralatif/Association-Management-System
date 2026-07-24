---
sidebar_position: 12
title: Workflows
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Workflows Module

Automate tasks — when something happens, automatically do something else.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Create automations** — Set up rules like "When a new member joins, send them a welcome email."

**Triggers** — Start a workflow when something happens: new member, payment received, event registration, etc.

**Actions** — What happens: send email, update record, add tag, notify admin, call webhook.

**Conditions** — Add if/then logic: "Only send this email if the member's type is 'premium'."

**Delays** — Wait before acting: "Send a follow-up email 3 days after registration."

**Run history** — See a log of every time a workflow ran and what happened.

### Try it now:

1. Click **Workflows** in the sidebar
2. Browse 17 seeded workflows
3. Check the workflow templates (pre-built automations you can copy)
4. Look at run history to see workflows in action

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (11)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/workflows/` | List workflows | Staff+ |
| `POST` | `/workflows/` | Create workflow | Staff+ |
| `GET` | `/workflows/stats` | Workflow statistics | Staff+ |
| `GET` | `/workflows/{id}` | Get workflow | Staff+ |
| `PUT` | `/workflows/{id}` | Update workflow | Staff+ |
| `DELETE` | `/workflows/{id}` | Delete workflow | Admin |
| `POST` | `/workflows/{id}/activate` | Activate workflow | Staff+ |
| `POST` | `/workflows/{id}/deactivate` | Deactivate workflow | Staff+ |
| `POST` | `/workflows/{id}/trigger` | Manually trigger | Staff+ |
| `GET` | `/workflows/{id}/runs` | Run history | Staff+ |
| `GET` | `/workflows/templates` | Pre-built templates | Staff+ |

### Workflow Data Model

```json
{
  "id": "uuid",
  "name": "Welcome New Members",
  "description": "Send welcome email + add to VIP group",
  "is_active": true,
  "trigger_type": "member_registered",
  "steps": [
    {"type": "send_email", "template": "welcome", "delay_hours": 0},
    {"type": "add_tag", "tag": "new-member"},
    {"type": "wait", "hours": 3},
    {"type": "send_email", "template": "getting-started-guide"}
  ]
}
```

### Trigger Types

| Trigger | Fires When |
|---|---|
| `member_registered` | New member created |
| `member_status_changed` | Member status changes |
| `payment_received` | Invoice paid |
| `invoice_overdue` | Invoice past due date |
| `event_registration` | Member registers for event |
| `event_attendance` | Member checks in |
| `form_submitted` | Form/announcement submitted |
| `manual` | Triggered manually via API |

### Action Types

| Action | What It Does |
|---|---|
| `send_email` | Send an email to the member |
| `add_tag` / `remove_tag` | Add or remove a member tag |
| `add_to_group` / `remove_from_group` | Move member in/out of group |
| `update_status` | Change member status |
| `create_task` | Create a follow-up task |
| `send_webhook` | Call an external URL |
| `send_notification` | Notify admin |
| `wait` | Delay before next step |
| `condition` | If/then branching |

### Example: Create a Workflow

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome New Members",
    "description": "Onboarding automation",
    "trigger_type": "member_registered",
    "steps": [
      {"type": "send_email", "template": "welcome"},
      {"type": "add_tag", "tag": "new-member"},
      {"type": "wait", "hours": 3},
      {"type": "send_email", "template": "getting-started"}
    ]
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Workflows](../testing/workflows)
- [Members](./members)
- [Communications](./communications)
