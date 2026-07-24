---
sidebar_position: 11
title: Documents
---

# Documents Module

Document management with versioning, sharing, and access control.

## Features

- **File Upload:** Upload PDFs, Word docs, images, spreadsheets
- **Categories:** Organize by type (bylaws, minutes, reports, templates)
- **Versioning:** Track document versions with changelog
- **Sharing:** Share with members, groups, or publicly
- **Comments:** Threaded comments on documents
- **Access Control:** Role-based document visibility
- **Activity Logs:** Track who viewed, downloaded, or modified

## API Endpoints (13 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/documents/` | List documents | Member |
| `POST` | `/documents/` | Upload document | Staff+ |
| `GET` | `/documents/stats` | Document statistics | Staff+ |
| `GET` | `/documents/{id}` | Get document details | Member |
| `PUT` | `/documents/{id}` | Update document metadata | Staff+ |
| `DELETE` | `/documents/{id}` | Delete document | Admin |
| `GET` | `/documents/{id}/versions` | List versions | Member |
| `POST` | `/documents/{id}/versions` | Upload new version | Staff+ |
| `GET` | `/documents/categories` | List categories | Member |
| `POST` | `/documents/categories` | Create category | Staff+ |
| `POST` | `/documents/{id}/share` | Share document | Staff+ |
| `POST` | `/documents/{id}/comments` | Add comment | Member |
| `GET` | `/documents/{id}/comments` | List comments | Member |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List documents
curl -s "$API/documents/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get document stats
curl -s "$API/documents/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Documents](../testing/documents.md) for complete test scripts.
