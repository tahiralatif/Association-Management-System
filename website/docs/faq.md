---
sidebar_position: 29
title: FAQ
---

# Frequently Asked Questions

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** (full access) | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** (limited access) | `demo@gmail.com` | `Demo1234!` | `demo-association` |

---

## General

### What is AssocHub?
AssocHub is an open-source, AI-powered Association Management System (AMS). It handles memberships, finances, events, communications, elections, documents, workflows, and analytics — all in one platform.

### Is it free?
Yes. AssocHub is open-source and free to self-host. There's also a managed cloud option starting at ~$29/month.

### What technology does it use?
- **Backend:** Python + FastAPI + PostgreSQL
- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **AI:** Llama models via OpenRouter
- **Queue:** Redis + Celery

### How many modules are there?
11 integrated modules with 199 REST API endpoints.

---

## Login & Registration

### What are the demo credentials?
See the table at the top of this page, or check the hint box on the login page.

### I can't log in. What's wrong?
1. Make sure you're using `Demo1234!` (capital D, capital D, exclamation mark)
2. Tenant ID must be exactly `demo-association`
3. If you registered a new account, you need to verify your email first
4. Check [Troubleshooting](./troubleshooting) for more help

### The password requirements are:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one special character (!@#$%^&*)

### I didn't receive a verification email
1. Check your spam/junk folder
2. Click "Resend verification email" on the login page
3. Make sure you entered the correct email during registration

---

## Modules

### Which modules require admin access?
Members, Finances, Events, Communications, Elections, Documents, Workflows, and Integrations require staff or admin role. Dashboard, AI Chat, and Documents (read-only) are available to all users.

### Does the AI chat actually work with real data?
Yes. The AI uses your actual database — member counts, revenue, events, etc. It's not a generic chatbot.

### Can I import members from a CSV file?
Yes. Go to Members → Import and upload a CSV file. The system maps columns automatically.

### How do elections work?
Elections support ranked-choice voting. Candidates are nominated, members vote by ranking candidates, and results are calculated using instant-runoff elimination.

---

## Technical

### Can I self-host it?
Yes. Docker deployment is supported. See [Deployment Guide](./admin/deployment).

### What database does it use?
PostgreSQL with pgvector extension (for AI embeddings).

### Are there rate limits on the AI?
OpenRouter has generous limits. The system automatically falls back to other models if one hits its limit.

### Where is the API documentation?
See [API Reference](./api-reference) or visit the live API docs at `https://ams.14.jugaar.ai/docs`.

---

## Related

- [Getting Started](./getting-started)
- [Troubleshooting](./troubleshooting)
- [API Reference](./api-reference)
