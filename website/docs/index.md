---
sidebar_position: 1
slug: /
title: Welcome to AssocHub
---

# Welcome to AssocHub Documentation

**The Complete Guide to AI-Powered Association Management**

AssocHub is an open-source, self-hosted Association Management System (AMS) with AI built into every module. This documentation covers everything from getting started to testing every feature.

## Live Demo

🌐 **[ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

## Quick Links

| What you need | Where to go |
|---|---|
| **First time?** | [Getting Started](./getting-started) |
| **Login / Register** | [Authentication](./registration) |
| **Explore a module** | [Modules Overview](./modules/dashboard) |
| **Test every feature** | [Testing Guide](./testing/overview) |
| **API reference** | [API Reference](./api-reference) |
| **Something broken?** | [Troubleshooting](./troubleshooting) |

## What's Inside AssocHub

AssocHub has **11 integrated modules** with **156 REST API endpoints**:

| Module | What it does | Endpoint count |
|---|---|---|
| **Dashboard** | KPI tracking, custom widgets, real-time overview | 7 |
| **Members** | Full lifecycle: profiles, groups, tags, bulk ops, import/export | 26 |
| **Finances** | Invoices, expenses, budgets, Stripe payments, dues | 20 |
| **Events** | Tickets, sessions, speakers, check-in, feedback | 15 |
| **Communications** | Campaigns, announcements, surveys, email templates | 16 |
| **Elections** | Nominations, ranked-choice voting, secret ballots | 15 |
| **Documents** | Versioning, sharing, categories, comments | 13 |
| **Workflows** | Visual builder, triggers, delays, conditions | 11 |
| **AI Engine** | Chat, churn prediction, anomalies, semantic search | 11 |
| **Analytics** | Dashboards, reports, KPIs, exports | 12 |
| **Integrations** | Webhooks, Stripe, external sync | 12 |

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL + pgvector
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **AI:** Groq (Llama 3.3 70B) for chat, embeddings, document generation
- **Queue:** Redis + Celery for background tasks
- **Payments:** Stripe Checkout + Webhooks

## Who Is This Book For?

- **Evaluators** — Testing AssocHub before adoption
- **Administrators** — Setting up and managing the system
- **Developers** — Understanding the API and extending the platform
- **QA Testers** — Step-by-step instructions for every feature

:::tip
This documentation includes **test scripts** you can run to verify every feature works. See the [Testing Guide](./testing/overview) for the complete testing methodology.
:::
