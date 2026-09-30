# Submission Desk

The operating desk for SEO retainers: live time tracking, 24 link-building trackers, monthly retainer plans, a manager dashboard and a shared site library. Built with **Next.js 16 (App Router)**, **Supabase** (Postgres, Auth, Realtime, RLS) and **Tailwind CSS v4**.

## Features

| Area | What it does |
| --- | --- |
| **Today** | Timer that follows you across devices, past-entry dialog, daily hours vs target, link-building quota bars, this week's plan items |
| **Link Building** | 24 submission types, one master site list each, per-project/per-month progress, Done / Blocked / Undo with optimistic UI, quotas |
| **Monthly Plan** | 30-task standard retainer template, copy last month, inline editing, capacity allocation bar, W1–W4 status cycling |
| **Dashboard** | Hours vs capacity, pace to month-end, daily hours chart, live timers, planned vs logged by block, output per person, CSV exports |
| **Site Library** | Bulk paste domains with DA, normalisation and de-duplication, search |
| **Team & Projects** | Roles (manager / executive), manager-created accounts, project capacity, daily quotas |
| **Everywhere** | Real-time sync between teammates, light/dark/system theme, mobile layout, row-level security |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), then [`0002_admin_only_signup.sql`](supabase/migrations/0002_admin_only_signup.sql).
3. **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000` (your production URL later) and add `http://localhost:3000/auth/callback` to *Redirect URLs*.
4. Set `SUPABASE_SERVICE_ROLE_KEY` on the server; managers need it to create accounts.

> There is **no public sign-up**. The first account on an empty desk becomes a manager; after that, only managers can create accounts (Team & Projects → Create user). This is enforced in the database, not just the UI.

### 2. App

Requires Node.js 20.9+.

```bash
cp .env.local.example .env.local   # then fill in your Supabase URL and anon key
npm install
npm run dev
```

Open http://localhost:3000, create your account, then go to **Team & Projects** to add your first project.

### 3. Deploy

Deploy to Vercel (or any Node host), set the same environment variables, and add the production `/auth/callback` URL to Supabase's redirect list.

## Accounts

Admin (manager) logins — temporary passwords, change them after the first sign-in (Settings → Password):

| Email | Role | Password |
| --- | --- | --- |
| seo@gteceducation.com | Manager (admin) | `Gtec-h7OBUOBoH3Aa` |
| gtm@gteceducation.com | Manager (admin) | `Gtec-MlJmT28atOMM` |

The executive login is kept in `CREDENTIALS.local.md` on the setup machine (git-ignored).

## Project structure

```
src/
  app/
    (app)/            authenticated screens: today, links, planner, dashboard, library, admin, settings
    actions.ts        all server actions (validated, RLS-enforced)
    api/export/       CSV exports
    auth/             callback, confirm, signout routes
    login/            sign-in / sign-up / magic link
    page.tsx          landing page
  components/         shell, UI primitives and per-screen client components
  lib/                supabase clients, session context, constants, utils
  proxy.ts            session refresh + auth gate
supabase/migrations/  schema, policies, realtime
```

## Data model

`profiles` · `projects` · `sites` · `submissions` · `time_entries` · `plan_tasks` · `quotas` · `active_timers`. RLS rules: everyone signed in can read everything. You can only write your own time entries, submissions and timer. Managers control projects, plans, quotas and roles. Anyone can tick weekly plan progress and add sites.
