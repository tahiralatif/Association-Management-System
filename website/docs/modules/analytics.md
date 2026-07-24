---
sidebar_position: 14
title: Analytics
---

# Analytics Module

Custom dashboards, KPI tracking, reports, and data export.

## Features

- **Overview Dashboard:** Aggregated metrics across all modules
- **Custom Dashboards:** Build dashboards with configurable widgets
- **KPI Tracking:** Time-series data for key metrics
- **Reports:** Generate detailed reports (members, finances, events)
- **Data Export:** Export data as CSV or JSON
- **Cross-Module Analysis:** Correlate data across modules

## API Endpoints (12 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/analytics/overview` | Dashboard overview | Staff+ |
| `GET` | `/analytics/dashboards` | List dashboards | Staff+ |
| `POST` | `/analytics/dashboards` | Create dashboard | Staff+ |
| `GET` | `/analytics/dashboards/{id}` | Get dashboard | Staff+ |
| `PUT` | `/analytics/dashboards/{id}` | Update dashboard | Staff+ |
| `DELETE` | `/analytics/dashboards/{id}` | Delete dashboard | Admin |
| `POST` | `/analytics/dashboards/{id}/widgets` | Add widget | Staff+ |
| `GET` | `/analytics/reports` | List reports | Staff+ |
| `POST` | `/analytics/reports` | Create report | Staff+ |
| `GET` | `/analytics/reports/{id}` | Get report | Staff+ |
| `GET` | `/analytics/reports/{id}/export` | Export report | Staff+ |
| `GET` | `/analytics/kpis` | KPI time-series | Staff+ |

## Overview Data Structure

```json
{
  "total_members": 23,
  "active_members": 23,
  "total_revenue": 45000.00,
  "monthly_recurring": 3750.00,
  "total_events": 17,
  "upcoming_events": 5,
  "total_invoices": 3,
  "outstanding_balance": 1200.00,
  "active_campaigns": 3,
  "total_documents": 8,
  "active_workflows": 17
}
```

## Widget Types

| Widget | Data Source | Visualization |
|---|---|---|
| `member_count` | Members | Number card |
| `revenue_chart` | Finances | Line/bar chart |
| `event_timeline` | Events | Timeline |
| `kpi_card` | Multiple | Big number + trend |
| `pie_chart` | Any module | Pie/donut chart |
| `table` | Any module | Data table |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# Get analytics overview
curl -s "$API/analytics/overview" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List dashboards
curl -s "$API/analytics/dashboards" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List reports
curl -s "$API/analytics/reports" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Analytics](../testing/analytics.md) for complete test scripts.
