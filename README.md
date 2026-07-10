# steam-backlog

Play what you love. Slowly make sense of the rest.

Product positioning: [`docs/positioning.md`](docs/positioning.md) (Linear [MXB-23](https://linear.app/steam-backlog/issue/MXB-23/target-user-and-positioning-doc)).

## Stack

Architecture decisions are recorded as ADRs in [`docs/adr/`](docs/adr/). Start with [ADR-0001: Laravel + Inertia stack](docs/adr/0001-laravel-inertia-stack.md) (Linear [MXB-26](https://linear.app/steam-backlog/issue/MXB-26/stack-and-architecture-decision)).

| Area | Choice |
|------|--------|
| Framework | Laravel |
| Frontend | Inertia.js + React |
| Database | PostgreSQL (prod), SQLite (local) |
| Auth | Steam OpenID, Laravel sessions |
| Hosting | Laravel Cloud |
| Jobs | Database queue + Scheduler |

Application code lives in [`steam-backlog/`](steam-backlog/) (Laravel + Inertia + React).

```bash
cd steam-backlog
composer install && npm install
php artisan migrate
composer dev
```

See [`steam-backlog/README.md`](steam-backlog/README.md) for full local setup.
