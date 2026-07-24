---
sidebar_position: 25
title: AI Engine
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: AI Engine

Test AI chat, insights, predictions, and semantic search.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: AI Chat

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **AI Engine** in the sidebar
2. Type: "How many active members do we have?"
3. ✅ AI responds with real data from your database
4. Try: "What events are coming up?"
5. Try: "Show me the revenue breakdown"

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many active members do we have?"}'
```

**Expected: 200 OK** with AI response using real member data.

</TabItem>
</Tabs>

## Test 2: AI Health

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the AI health status indicator
2. ✅ Shows green when LLM is connected

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/ai/health \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: AI Insights

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click on "Insights" in the AI section
2. ✅ See auto-generated insights about your data

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/ai/insights \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 4: Churn Prediction

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Go to a member profile in the Members module
2. Look for AI churn risk indicator
3. ✅ Shows risk level and factors

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/predict/churn/{member_id} \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 5: Anomaly Detection

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/predict/anomalies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"module": "finances", "lookback_days": 30}'
```

</TabItem>
</Tabs>

## Test 6: Available Models

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/ai/models \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: AI Engine](../modules/ai-engine)
- [Testing: Analytics](./analytics)
