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
| **Team & Projects** | Roles (manager / executive), email invites, project capacity, daily quotas |
| **Everywhere** | Real-time sync between teammates, light/dark/system theme, mobile layout, row-level security |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it.
3. **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000` (your production URL later) and add `http://localhost:3000/auth/callback` to *Redirect URLs*.
4. Optional, for email invites: under **Authentication → Email Templates → Invite user**, change the link to  
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings`

> The **first account** created becomes a manager automatically. Everyone after that starts as an executive.

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

Logins for the team accounts (2 managers, 1 executive) are kept in `CREDENTIALS.local.md` on the setup machine. It is git-ignored and never pushed. Ask a manager for access, and change your temporary password after the first sign-in.

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
