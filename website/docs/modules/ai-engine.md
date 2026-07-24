---
sidebar_position: 13
title: AI Engine
---

# AI Engine Module

Built-in AI assistant powered by Groq (Llama 3.3 70B) with predictive analytics.

## Features

- **AI Chat:** Natural language assistant for association management
- **Churn Prediction:** RFM (Recency, Frequency, Monetary) scoring
- **Anomaly Detection:** Z-score and IQR-based statistical analysis
- **Semantic Search:** Vector embeddings via pgvector for document search
- **Document Generation:** AI-powered report and letter generation
- **Insights Engine:** Automated insights across all modules

## API Endpoints (11 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/ai/models` | List available AI models | Staff+ |
| `POST` | `/ai/chat` | Chat with AI assistant | Member |
| `POST` | `/ai/insights` | Generate insights | Staff+ |
| `GET` | `/ai/insights` | Get cached insights | Member |
| `POST` | `/ai/predict/churn` | Predict member churn | Staff+ |
| `POST` | `/ai/detect/anomalies` | Detect anomalies in data | Staff+ |
| `POST` | `/ai/embeddings` | Create vector embeddings | Staff+ |
| `POST` | `/ai/search/semantic` | Semantic search | Member |
| `POST` | `/ai/generate/document` | AI document generation | Staff+ |
| `POST` | `/ai/generate/email` | AI email generation | Staff+ |
| `GET` | `/ai/usage` | AI usage statistics | Staff+ |

## AI Chat Example

```bash
curl -X POST http://localhost:8002/api/v1/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many active members do we have?",
    "context": "association_management"
  }'
```

## Churn Prediction

Uses RFM analysis to score members:
- **Recency:** How recently did they interact?
- **Frequency:** How often do they engage?
- **Monetary:** How much do they spend?

Members scoring below threshold are flagged as "at-risk."

## Semantic Search

Documents are embedded using Groq's embedding model and stored in PostgreSQL's pgvector extension. Search uses cosine similarity.

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List AI models
curl -s "$API/ai/models" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Chat with AI
curl -s -X POST "$API/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are our most active members?","context":"association_management"}' | python3 -m json.tool
```

See [Testing: AI Engine](../testing/ai-engine.md) for complete test scripts.
