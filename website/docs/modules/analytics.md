---
sidebar_position: 14
title: Analytics
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Analytics Module

Charts, reports, and trends about your association's performance.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Overview** — See key numbers at a glance: members, revenue, events.

**Dashboards** — Create custom dashboard views with different charts and widgets.

**Reports** — Generate detailed reports on any module (members, finances, events, etc.).

**Export** — Download reports as CSV or JSON files.

### Try it now:

1. Click **Analytics** in the sidebar
2. See the overview dashboard with member stats, financial stats, and event stats
3. Check the dashboards section for pre-built views
4. Look at the reports section

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (12)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/analytics/overview` | Dashboard overview | Staff+ |
| `GET` | `/analytics/dashboards` | List dashboards | Staff+ |
| `POST` | `/analytics/dashboards` | Create dashboard | Staff+ |
| `GET` | `/analytics/dashboards/{id}` | Get dashboard | Staff+ |
| `PUT` | `/analytics/dashboards/{id}` | Update dashboard | Staff+ |
| `DELETE` | `/analytics/dashboards/{id}` | Delete dashboard | Admin |
| `GET` | `/analytics/dashboards/{id}/widgets` | Widget layout | Staff+ |
| `GET` | `/analytics/reports` | List reports | Staff+ |
| `POST` | `/analytics/reports` | Generate report | Staff+ |
| `GET` | `/analytics/reports/{id}` | Get report | Staff+ |
| `GET` | `/analytics/reports/{id}/download` | Download report | Staff+ |
| `GET` | `/analytics/export` | Export data (CSV/JSON) | Staff+ |

### Example: Get Overview

```bash
curl -s https://ams.14.jugaar.ai/api/v1/analytics/overview \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Example: Generate a Report

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/analytics/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Member Report",
    "type": "members",
    "date_range": "last_30_days",
    "format": "pdf"
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Analytics](../testing/analytics)
- [Dashboard](./dashboard)
- [AI Engine](./ai-engine)
