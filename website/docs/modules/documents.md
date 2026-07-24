---
sidebar_position: 11
title: Documents
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Documents Module

Upload, organize, and control access to files and documents.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Upload files** — Add documents with titles, descriptions, and categories.

**Organize** — Put files into categories (reports, templates, policies, meeting minutes).

**Version control** — Upload new versions of a document. Old versions are kept.

**Sharing** — Control who can see each document.

**Comments** — Add notes or feedback on documents.

### Try it now:

1. Click **Documents** in the sidebar
2. Browse 28 seeded documents — reports, templates, policies, meeting minutes
3. Click on a document to see its details and version history
4. Check the document statistics

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (13)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/documents/` | List documents | Staff+ |
| `POST` | `/documents/` | Upload document | Staff+ |
| `GET` | `/documents/stats` | Document statistics | Staff+ |
| `GET` | `/documents/{id}` | Get document | Staff+ |
| `PUT` | `/documents/{id}` | Update document | Staff+ |
| `DELETE` | `/documents/{id}` | Delete document | Admin |
| `POST` | `/documents/{id}/versions` | Upload new version | Staff+ |
| `GET` | `/documents/{id}/versions` | List versions | Staff+ |
| `GET` | `/documents/categories` | List categories | Member |
| `POST` | `/documents/categories` | Create category | Staff+ |
| `POST` | `/documents/{id}/share` | Share document | Staff+ |
| `POST` | `/documents/{id}/comments` | Add comment | Member |
| `GET` | `/documents/{id}/comments` | List comments | Member |

### Example: Upload a Document

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/documents/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q2 Financial Report",
    "description": "Quarterly financial summary",
    "category": "reports",
    "content": "Full report text here..."
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Documents](../testing/documents)
- [Workflows: Document Automation](./workflows)
