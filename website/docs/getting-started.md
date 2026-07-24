---
sidebar_position: 2
title: Getting Started
---

# Getting Started with AssocHub

This guide walks you through your first interaction with AssocHub — from opening the website to exploring the dashboard.

## Prerequisites

- A web browser (Chrome, Firefox, Edge, Safari)
- Internet connection (for the live demo) or local installation
- That's it!

## Step 1: Open AssocHub

Navigate to the live demo:

```
https://ams.14.jugaar.ai
```

You'll see the **Landing Page** with:
- AssocHub branding and 3D animations
- Feature highlights (modules, AI capabilities, tech stack)
- Two call-to-action buttons: **Get Started** and **Sign In**

:::info
The landing page is publicly accessible — no login required.
:::

## Step 2: Create an Account

1. Click **Get Started** (or navigate to `/register`)
2. Fill in the registration form:

| Field | Example |
|---|---|
| First Name | `John` |
| Last Name` | `Smith` |
| Email | `john@example.com` |
| Tenant ID | `default` |
| Password | `MySecure123!` |
| Confirm Password | `MySecure123!` |

3. Click **Create Account**

You'll be automatically redirected to the **Dashboard**.

:::tip
Your account is assigned the `member` role by default. Some modules (like Analytics stats and Members list) require admin or staff roles. See [User Roles](./admin/user-roles) for details.
:::

## Step 3: Explore the Dashboard

After registration, you land on the **Dashboard** — your central hub:

- **KPI Cards:** Active members, total revenue, upcoming events
- **Sidebar Navigation:** Access all 11 modules
- **User Profile:** Your name and role in the top bar
- **Logout Button:** Sign out when done

## Step 4: Navigate the Sidebar

The left sidebar contains links to every module:

```
Dashboard        ← You are here
Members          ← Member profiles, groups, tags
Finances         ← Invoices, expenses, budgets
Events           ← Event management, tickets, sessions
Communications   ← Campaigns, announcements, surveys
Elections        ← Voting, nominations
Documents        ← File management, sharing
Workflows        ← Automation builder
AI Engine        ← Chat, predictions, insights
Analytics        ← Reports, dashboards, KPIs
Integrations     ← Webhooks, Stripe, external APIs
```

Click any module to explore its features.

## Step 5: Log Out

1. Click the **Logout** button in the sidebar
2. You'll be redirected to the Login page
3. Your session is cleared

## Step 6: Log Back In

1. Enter your email and password
2. Enter `default` for Tenant ID
3. Click **Sign In**
4. You're back on the Dashboard!

---

## What's Next?

- **Explore modules:** Start with [Members](./modules/members) or [Events](./modules/events)
- **Test everything:** Follow the [Testing Guide](./testing/overview) for step-by-step verification
- **API access:** See the [API Reference](./api-reference) for programmatic access

---

## Account Types

| Role | What they can do |
|---|---|
| `member` | View profile, self-service, limited module access |
| `staff` | All member features + manage members, events, finances |
| `tenant_admin` | All staff features + admin settings, users, roles |
| `super_admin` | Full system access across all tenants |
