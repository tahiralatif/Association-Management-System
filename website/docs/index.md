---
sidebar_position: 1
slug: /
title: Welcome to AssocHub
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Welcome to AssocHub Documentation

**The Complete Guide to AI-Powered Association Management**

AssocHub is an open-source, self-hosted Association Management System (AMS) with AI built into every module.

## 🔑 Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** | `demo@gmail.com` | `Demo1234!` | `demo-association` |

🌐 **[Open Live Demo →](https://ams.14.jugaar.ai)**

:::tip Quick Start
Open the demo link → Click **Sign In** → Enter the admin credentials above → You're in!
:::

## How to Use This Documentation

Every page has a **difficulty toggle** at the top:

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**For non-technical users.** Plain English instructions with screenshots descriptions. Just follow the steps in your browser — no code needed.

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

**For developers and testers.** curl commands, HTTP status codes, data models, and automation scripts.

</TabItem>
</Tabs>

## Quick Links

| What you need | Where to go |
|---|---|
| **First time here?** | [Getting Started](./getting-started) — login and explore in 2 minutes |
| **What does each module do?** | [Modules Overview](./modules/dashboard) — plain-English feature descriptions |
| **Test every feature** | [Testing Guide](./testing/overview) — step-by-step verification |
| **API reference** | [API Reference](./api-reference) — all 199 endpoints |
| **Something broken?** | [Troubleshooting](./troubleshooting) — common issues and fixes |

## What's Inside AssocHub

AssocHub has **11 integrated modules** with **199 REST API endpoints**:

| Module | What it does (plain English) | Endpoints |
|---|---|---|
| **Dashboard** | See everything at a glance — members, money, events | 7 |
| **Members** | Add people, organize them into groups, track who's active | 26 |
| **Finances** | Send invoices, track payments, manage budgets | 20 |
| **Events** | Create events, sell tickets, check people in | 15 |
| **Communications** | Send email campaigns, post announcements, run surveys | 16 |
| **Elections** | Run elections with ranked-choice voting and secret ballots | 15 |
| **Documents** | Upload files, organize them, control who sees what | 13 |
| **Workflows** | Automate tasks — "when X happens, do Y" | 11 |
| **AI Engine** | Ask your data questions in plain English, get predictions | 11 |
| **Analytics** | Charts, reports, and trends about your association | 12 |
| **Integrations** | Connect to Stripe, webhooks, and external services | 12 |

## Tech Stack

- **Backend:** Python + FastAPI + PostgreSQL
- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **AI:** Llama models via OpenRouter
- **Queue:** Redis + Celery for background tasks
- **Payments:** Stripe

## Who Is This Book For?

- **Evaluators** — Want to see if AssocHub fits your organization? Start with [Getting Started](./getting-started).
- **Administrators** — Setting up and managing the system? Check [Admin Guide](./admin/user-roles).
- **Developers** — Extending the platform? See [API Reference](./api-reference).
- **QA Testers** — Need to verify every feature works? Go to [Testing Guide](./testing/overview).
