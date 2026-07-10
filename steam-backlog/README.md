# Steam Backlog (Laravel)

Laravel + Inertia.js + React application. Stack decisions: [ADR-0001](../docs/adr/0001-laravel-inertia-stack.md).

## Local setup

```bash
composer install
cp .env.example .env   # if needed
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm install
npm run build
```

## Development

```bash
composer dev
```

Runs the PHP server, queue worker, log tail, and Vite dev server together.

Or separately:

```bash
php artisan serve
php artisan queue:work
npm run dev
```

## Production database

Use PostgreSQL on Laravel Cloud. Set `DB_CONNECTION=pgsql` and the corresponding `DB_*` variables in the deployment environment.
