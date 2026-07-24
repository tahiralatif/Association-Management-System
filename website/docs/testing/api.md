---
sidebar_position: 28
title: API Testing
---

# Testing: API Fundamentals

## Base URL

- **Local:** `http://localhost:8002/api/v1`
- **Live:** `https://ams.14.jugaar.ai/api/v1`

## Authentication

All protected endpoints require a JWT Bearer token:

```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Use token in requests
curl -s http://localhost:8002/api/v1/members/ \
  -H "Authorization: Bearer $TOKEN"
```

## OpenAPI Spec

Full interactive API docs are available at:

```
http://localhost:8002/docs      # Swagger UI
http://localhost:8002/redoc     # ReDoc
http://localhost:8002/openapi.json  # Raw spec
```

## Error Responses

| Status | Meaning | Example |
|---|---|---|
| `400` | Bad Request | `{"detail":"Invalid credentials"}` |
| `401` | Not Authenticated | `{"detail":"Not authenticated"}` |
| `403` | Forbidden | `{"detail":"Required roles: super_admin"}` |
| `404` | Not Found | `{"detail":"Resource not found"}` |
| `409` | Conflict | `{"detail":"Email already registered"}` |
| `422` | Validation Error | `{"detail":[{"msg":"field required",...}]}` |
| `500` | Server Error | `{"detail":"Internal server error"}` |

## Pagination

Most list endpoints support pagination:

```bash
curl -s "http://localhost:8002/api/v1/members/?skip=0&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "total": 23,
  "items": [...]
}
```

## Filtering

Some endpoints support filtering:

```bash
# Filter by status
curl -s "http://localhost:8002/api/v1/members/?status=active" \
  -H "Authorization: Bearer $TOKEN"

# Search
curl -s "http://localhost:8002/api/v1/members/search?q=daniel" \
  -H "Authorization: Bearer $TOKEN"
```

## Health Check

```bash
curl -s http://localhost:8002/health | python3 -m json.tool
```

**Expected:**
```json
{
  "status": "healthy|degraded",
  "version": "0.1.0",
  "services": {
    "database": {"status": "ok"},
    "redis": {"status": "ok|error"},
    "celery": {"status": "ok|error"}
  }
}
```

## Rate Limiting

The API implements rate limiting per IP. Exceeding limits returns:
```
HTTP 429 Too Many Requests
```

## CORS

The API allows cross-origin requests from:
- `http://localhost:3002` (frontend dev)
- `https://ams.14.jugaar.ai` (production)
