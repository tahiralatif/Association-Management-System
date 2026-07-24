---
sidebar_position: 34
title: FAQ
---

# Frequently Asked Questions

## General

### What is AssocHub?

AssocHub is an open-source, self-hosted Association Management System (AMS) with AI built into every module. It helps non-profits, professional associations, and membership organizations manage members, finances, events, communications, elections, and more.

### Is AssocHub free?

Yes. AssocHub is open-source and free to self-host. You pay for your own infrastructure (server, database). For managed hosting, pricing is flat-rate per tenant with no per-contact fees.

### How does AssocHub compare to Wild Apricot or MemberClicks?

AssocHub offers 156 API endpoints across 11 modules with built-in AI, elections, and workflows — all with zero per-contact pricing. See the full [competitive comparison](https://github.com/tahiralatif/Association-Management-System/blob/main/docs/COMPARISON.md).

### What tech stack does AssocHub use?

- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL + pgvector
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **AI:** Groq (Llama 3.3 70B)
- **Queue:** Redis + Celery
- **Payments:** Stripe

## Authentication

### How do I register?

Go to `https://ams.14.jugaar.ai/register`, fill in the form, and click Create Account. You'll be logged in automatically.

### What are the password requirements?

At least 8 characters, with uppercase, lowercase, digit, and special character. Common passwords are rejected.

### Can I have multiple roles?

Yes. Users can have multiple roles (e.g., `staff` + `tenant_admin`). Roles are stored as an array.

### How long does a login session last?

JWT tokens expire after 24 hours. You'll need to log in again after expiry.

## Modules

### Can I import existing member data?

Yes. Go to Members → Import and upload a CSV file. The system supports field mapping for columns.

### Does AssocHub support online payments?

Yes. AssocHub integrates with Stripe for checkout sessions, recurring payments, and payment webhooks.

### Can I create custom workflows?

Yes. The workflow builder supports 12+ action types including email, member updates, delays, conditional branches, webhooks, and AI analysis.

### Is there an AI assistant?

Yes. AssocHub includes a built-in AI chat powered by Groq (Llama 3.3 70B) that can answer questions about your association data, predict member churn, detect anomalies, and generate documents.

### Can I run elections?

Yes. AssocHub has a full elections module supporting ranked-choice voting, secret ballots, nominations, quorum tracking, and real-time results.

## Technical

### Can I self-host AssocHub?

Yes. AssocHub is designed for self-hosting. See the [Deployment Guide](./admin/deployment) for instructions.

### What database does AssocHub use?

PostgreSQL with the pgvector extension for AI-powered semantic search.

### Does AssocHub support multiple organizations?

Yes. AssocHub supports multi-tenancy where multiple organizations share one installation with completely isolated data.

### Is there a REST API?

Yes. AssocHub has 161 REST API endpoints. Interactive documentation is available at `/docs` (Swagger UI) on any running instance.

### Can I extend AssocHub?

Yes. AssocHub is open-source (MIT license). You can fork, modify, and extend any module. The modular architecture makes it easy to add new features.

## Troubleshooting

### I'm getting 401 errors. What do I do?

Your token may have expired. Log in again to get a fresh token. See [Troubleshooting](./troubleshooting) for more details.

### The AI chat isn't working. Why?

You need a valid Groq API key set in the `GROQ_API_KEY` environment variable. Get one free at [console.groq.com](https://console.groq.com).

### How do I reset my admin password?

See the [Troubleshooting Guide](./troubleshooting#reset-admin-password) for step-by-step instructions.

### Where can I report bugs?

Open an issue on [GitHub](https://github.com/tahiralatif/Association-Management-System/issues).
