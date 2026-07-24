---
sidebar_position: 13
title: AI Engine
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AI Engine Module

Ask your association data questions in natural language and get intelligent answers.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Chat Assistant** — Ask questions in plain English. The AI knows your data and answers using real numbers.

**AI Insights** — Get automatic analysis of trends across your association.

**Semantic Search** — Find documents by meaning, not just keywords.

**Churn Prediction** — AI identifies members at risk of leaving.

**Anomaly Detection** — Catches unusual financial transactions or attendance patterns.

**Document Generation** — AI creates polished reports, minutes, and letters.

### Try it now:

1. Click **AI Engine** in the sidebar
2. Type: "How many active members do we have?"
3. The AI answers with your actual data
4. Try: "What events are coming up this month?"
5. Try: "Show me the revenue breakdown"

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (11)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/ai/chat` | Chat with AI | Everyone |
| `GET` | `/ai/health` | AI service health | Everyone |
| `GET` | `/ai/insights` | Auto-generated insights | Staff+ |
| `POST` | `/ai/embeddings/search` | Semantic search | Staff+ |
| `GET` | `/ai/models` | Available AI models | Staff+ |
| `POST` | `/ai/predict/churn/{member_id}` | Churn prediction | Staff+ |
| `POST` | `/ai/predict/anomalies` | Anomaly detection | Staff+ |
| `POST` | `/ai/generate/document` | AI document generation | Staff+ |
| `GET` | `/ai/conversations/{session_id}` | Conversation history | Member |
| `DELETE` | `/ai/conversations/{session_id}` | Delete conversation | Member |
| `GET` | `/ai/embeddings/stats` | Embedding statistics | Staff+ |

### LLM Configuration

- **Provider:** OpenRouter (primary), Groq (fallback)
- **Primary Model:** `meta-llama/llama-3.1-8b-instruct`
- **Fallback Models:** `google/gemma-4-31b-it:free` → `llama-3.1-8b-instant`
- **Embeddings:** pgvector with 384-dimensional vectors

### Example: Chat

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many active members do we have?"}'
```

**Expected response (200):**
```json
{
  "response": "You have 57 active members out of 78 total members...",
  "session_id": "uuid",
  "model_used": "meta-llama/llama-3.1-8b-instruct",
  "sources": ["members_table", "member_stats"]
}
```

### Example: Churn Prediction

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/predict/churn/{member_id} \
  -H "Authorization: Bearer $TOKEN"
```

**Returns:** Risk score (0-1), contributing factors, recommended actions.

### Example: Anomaly Detection

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/predict/anomalies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"module": "finances", "lookback_days": 30}'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: AI Engine](../testing/ai-engine)
- [Members: Churn Prediction](./members)
- [Analytics](./analytics)
