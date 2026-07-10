---
status: accepted
linear: MXB-26
---

# Laravel + Inertia stack

Steam Backlog MVP is a Laravel application with Inertia.js and React for the UI. The initial Next.js scaffold is replaced, not extended. This stack was chosen in a grilling session (MXB-26) to keep one deployable monolith with first-class background jobs and Steam session auth, without operating separate frontend and API services.

## Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| Application framework | **Laravel** | Monolith with routing, ORM, queues, scheduler, and auth built in. Replaces Next.js. |
| Frontend | **Inertia.js + React** | Interactive triage and kanban in React; Laravel owns routing, auth, and data loading. Reuses React/shadcn patterns from the discarded Next scaffold. |
| Database (production) | **PostgreSQL** | Relational model for users, games, and sync state; strong constraints; easy to host on Laravel Cloud. |
| Database (local) | **SQLite** | Zero-setup local dev; same migrations as production. |
| Auth | **Steam OpenID only, Laravel sessions** | Product is Steam-native (MXB-6). Session cookies via web middleware; no password auth or third-party auth service for MVP. |
| Hosting | **Laravel Cloud** | Managed Laravel hosting with Postgres, workers, and scheduler support. |
| Background jobs | **Laravel database queue + Scheduler** | Scheduled library sync (MXB-33) without Redis. Upgrade to Redis queue driver when job volume warrants it. |
| Repository layout | **Laravel app in `steam-backlog/`** | Replace the Next.js tree in that directory. Shared docs (`docs/adr/`, `CONTEXT.md`) live at repo root. |

## Deferred (not MVP)

- Redis queue driver
- Third-party auth (Clerk, Auth0)
- Email/password login
- Separate JSON API + SPA
- Vercel / Next.js hosting

## Downstream Linear issues

- **MXB-6** — Steam OpenID via Socialite or custom OpenID handler; Laravel session auth
- **MXB-19** — Deploy to Laravel Cloud (not Vercel)
- **MXB-30** — Secrets via `.env` locally and Laravel Cloud environment variables
- **MXB-33** — `SyncUserLibrary` (or equivalent) job dispatched by Scheduler; `queue:work` worker on Laravel Cloud

## Considered alternatives

- **Next.js 16 (existing scaffold)** — Rejected. Background sync, session auth, and scheduled jobs are simpler in Laravel without bolting on a separate worker host.
- **Livewire** — Rejected. Kanban drag-and-drop and triage interactions fit React better.
- **Laravel API + separate SPA** — Rejected for MVP. Two deployables and duplicate auth glue for no gain at this scale.
- **Railway / Fly.io** — Considered for hosting; Laravel Cloud chosen for Laravel-native managed ops.
