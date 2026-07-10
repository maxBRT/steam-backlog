# Agent Instructions

Guidelines for AI agents working on the Steam Backlog codebase.

## Testing Requirements

All code changes MUST include appropriate tests. Follow the test strategy documented in [`docs/test-strategy.md`](docs/test-strategy.md).

### When to Test

- **Always** write tests for new features, bug fixes, and refactoring
- **Unit tests** for domain logic (triage, board, sync)
- **Feature tests** for HTTP endpoints and user flows
- **Mock Steam API** in all tests (never hit real endpoints)

### Test Patterns

```php
// Use factories for test data
$entry = UserGame::factory()->backlog()->playing()->create();

// Mock Steam API
SteamApiMock::smallLibrary();
SteamApiMock::singlePlayer(['steamid' => '76561197960435530']);

// Test behavior, not implementation
$entry->hide();
expect($entry->triage_status)->toBe('hidden');
expect($entry->board_column)->toBeNull();
```

### Running Tests

```bash
# Full test suite (includes lint + types)
composer test

# Just PHPUnit
php artisan test

# Specific suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Watch mode (requires --parallel support)
php artisan test --parallel
```

### Test Coverage Goals

- Unit tests: all domain logic (models, services, DTOs)
- Feature tests: all HTTP endpoints
- Mock fixtures: realistic Steam API responses

## Development Workflow

### Local Setup

```bash
cd steam-backlog
composer install && npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
composer dev
```

### Code Quality

All code must pass:
- **Pint** (PHP code style): `composer lint` or `composer lint:check`
- **PHPStan** (static analysis): `composer types:check`
- **ESLint** (JS/TS linting): `npm run lint:check`
- **Prettier** (JS/TS formatting): `npm run format:check`

Run `composer test` to check everything at once.

### Git Workflow

- Create feature branches: `git checkout -b feature/description`
- Commit messages: descriptive, present tense ("Add triage actions")
- Push changes: `git push -u origin feature/description`
- Create PRs via GitHub interface or `gh pr create`

## Domain Language

Follow terminology in [`CONTEXT.md`](CONTEXT.md):

- **User** (not account, player)
- **Game** (not title, app)
- **Library entry** (not user_game in domain logic)
- **Triage status** (not status, disposition)
- **Board column** (not kanban status)
- **Hide** (not dismiss, archive)

## Steam API Integration

Use Laravel's `Http::fake()` for all Steam API interactions:

```php
use Tests\Helpers\SteamApiMock;

// Mock owned games response
SteamApiMock::ownedGames([
    ['appid' => 440, 'playtime_forever' => 1000],
]);

// Mock player summary
SteamApiMock::singlePlayer();

// Mock API failure
SteamApiMock::failure('*', 503);
```

Fixtures live in `tests/Fixtures/Steam/`.

## Data Model Invariants

Enforce these rules in the application layer (not DB constraints for MVP):

1. **Board only for backlog**: `board_column` and `board_position` are non-null only when `triage_status = backlog`
2. **Hide clears board**: Setting `triage_status = hidden` also sets board fields to null
3. **Idempotent sync**: Re-import updates playtime but never resets `triage_status` or board fields
4. **Removed, not deleted**: When a game disappears from Steam, set `removed_at`, preserve state
5. **Board ordering**: `board_position` is an integer rank per `(user_id, board_column)`

## Architecture Decisions

Stack decisions are documented in ADRs (`docs/adr/`). Start with [ADR-0001: Laravel + Inertia stack](docs/adr/0001-laravel-inertia-stack.md).

| Area | Choice |
|------|--------|
| Framework | Laravel |
| Frontend | Inertia.js + React |
| Database | PostgreSQL (prod), SQLite (local/test) |
| Auth | Steam OpenID, Laravel sessions |
| Jobs | Database queue + Scheduler |

## References

- **Test Strategy**: [`docs/test-strategy.md`](docs/test-strategy.md)
- **Data Model**: [`docs/data-model.md`](docs/data-model.md)
- **Domain Language**: [`CONTEXT.md`](CONTEXT.md)
- **Product Positioning**: [`docs/positioning.md`](docs/positioning.md)
