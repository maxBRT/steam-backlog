---
linear: MXB-35
status: active
---

# Test Strategy

Testing approach for Steam Backlog MVP. Balances speed, maintainability, and confidence for a small team shipping a real product.

## Philosophy

- **Test behavior, not implementation.** Tests should verify what the system does, not how it does it.
- **Fast feedback loop.** Unit tests run in milliseconds. Feature tests should complete in seconds.
- **Minimal mocking.** Use real Laravel services (DB, queue, cache) in tests. Mock only external APIs (Steam).
- **Test data factories.** Build valid domain entities with sensible defaults. Override only what matters for the test.

## Test Levels

### Unit Tests

Test domain logic in isolation. No HTTP, no database reads (writes are allowed with RefreshDatabase for setup).

**What to unit test:**
- Triage status transitions and invariants
- Board position calculations
- Library sync logic (parsing Steam responses, updating records)
- Model methods and scopes
- Value objects and DTOs

**Example: Triage invariant**
```php
// tests/Unit/TriageInvariantTest.php
test('hiding a library entry clears board placement', function () {
    $entry = UserGame::factory()->backlog()->onBoard('playing')->create();
    
    $entry->hide();
    
    expect($entry->triage_status)->toBe(TriageStatus::Hidden)
        ->and($entry->board_column)->toBeNull()
        ->and($entry->board_position)->toBeNull();
});
```

### Feature Tests

Test full request/response cycles through controllers. Uses in-memory SQLite, mocked Steam API.

**What to feature test:**
- Auth flows (Steam OpenID login, logout, session handling)
- Triage actions (hide, maybe, backlog)
- Board operations (move to column, reorder)
- Library sync endpoints (trigger sync, view status)
- Validation and error handling

**Example: Triage flow**
```php
// tests/Feature/TriageFlowTest.php
test('authenticated user can triage unreviewed games', function () {
    $user = User::factory()->create();
    $game = Game::factory()->create();
    $entry = UserGame::factory()->unreviewed()->for($user)->for($game)->create();
    
    actingAs($user)
        ->post(route('triage.backlog', $entry), ['board_column' => 'queue'])
        ->assertRedirect(route('triage'));
    
    expect($entry->fresh())
        ->triage_status->toBe(TriageStatus::Backlog)
        ->board_column->toBe(BoardColumn::Queue)
        ->board_position->toBe(0);
});
```

### Browser Tests (Deferred for MVP)

End-to-end tests using Laravel Dusk are valuable but slow. Defer until after launch unless specific UI interactions demand it.

If needed post-launch:
- Critical user journeys (signup, first sync, first triage session)
- JavaScript-heavy interactions (drag-and-drop board reordering)

## Steam API Mocking

Use Laravel's `Http::fake()` for all Steam Web API interactions. Never hit real Steam endpoints in tests.

### Steam API Surfaces

| Endpoint | Purpose | Mock Strategy |
|----------|---------|---------------|
| Steam OpenID | Login flow | Mock redirect + validate responses |
| `GetOwnedGames` | Library sync | Fixture JSON responses |
| `GetPlayerSummaries` | Profile data | Fixture JSON responses |

### Mock Implementation

Create reusable mock helpers in `tests/Helpers/SteamApiMock.php`:

```php
class SteamApiMock
{
    public static function ownedGames(array $games = []): void
    {
        Http::fake([
            'api.steampowered.com/IPlayerService/GetOwnedGames/*' => Http::response([
                'response' => [
                    'game_count' => count($games),
                    'games' => $games,
                ],
            ], 200),
        ]);
    }
    
    public static function playerSummaries(array $players = []): void
    {
        Http::fake([
            'api.steampowered.com/ISteamUser/GetPlayerSummaries/*' => Http::response([
                'response' => [
                    'players' => $players,
                ],
            ], 200),
        ]);
    }
    
    public static function failure(string $pattern, int $status = 500): void
    {
        Http::fake([
            $pattern => Http::response([], $status),
        ]);
    }
}
```

### Fixture Data

Store realistic Steam API responses in `tests/Fixtures/Steam/`:

```
tests/Fixtures/Steam/
├── owned_games_empty.json
├── owned_games_small.json      # 5-10 games
├── owned_games_large.json      # 100+ games
├── player_summary.json
└── openid_validation.json
```

Example usage:
```php
SteamApiMock::ownedGames(
    json_decode(file_get_contents(__DIR__.'/../Fixtures/Steam/owned_games_small.json'), true)
);
```

## Test Data Factories

Use Laravel factories to create valid domain objects. Follow these conventions:

### Factory States

Define named states for common scenarios:

```php
// database/factories/UserGameFactory.php
class UserGameFactory extends Factory
{
    public function unreviewed(): static
    {
        return $this->state([
            'triage_status' => TriageStatus::Unreviewed,
            'board_column' => null,
            'board_position' => null,
        ]);
    }
    
    public function backlog(): static
    {
        return $this->state([
            'triage_status' => TriageStatus::Backlog,
        ]);
    }
    
    public function onBoard(BoardColumn $column, ?int $position = null): static
    {
        return $this->state([
            'triage_status' => TriageStatus::Backlog,
            'board_column' => $column,
            'board_position' => $position ?? 0,
        ]);
    }
    
    public function removed(): static
    {
        return $this->state([
            'removed_at' => now(),
        ]);
    }
}
```

### Factory Relationships

Always create related records when needed:

```php
// Explicit relationships
$entry = UserGame::factory()
    ->for(User::factory()->create())
    ->for(Game::factory()->create())
    ->create();

// Shorthand when relationships don't matter
$entry = UserGame::factory()->create();  // Auto-creates user and game
```

## Test Organization

```
tests/
├── Feature/              # Controller/HTTP tests
│   ├── Auth/
│   │   ├── SteamLoginTest.php
│   │   └── SteamCallbackTest.php
│   ├── Triage/
│   │   ├── TriageFlowTest.php
│   │   └── TriageActionsTest.php
│   ├── Board/
│   │   ├── BoardViewTest.php
│   │   └── BoardOperationsTest.php
│   └── Sync/
│       ├── LibrarySyncTest.php
│       └── SyncStatusTest.php
├── Unit/                 # Domain logic tests
│   ├── Models/
│   │   ├── UserGameTest.php
│   │   └── GameTest.php
│   ├── Services/
│   │   ├── SteamSyncServiceTest.php
│   │   └── TriageServiceTest.php
│   └── Enums/
│       ├── TriageStatusTest.php
│       └── BoardColumnTest.php
├── Fixtures/
│   └── Steam/
│       ├── owned_games_empty.json
│       ├── owned_games_small.json
│       └── player_summary.json
└── Helpers/
    ├── SteamApiMock.php
    └── TestHelpers.php
```

## Running Tests

```bash
# Full suite (lint + types + tests)
composer test

# Just PHPUnit
php artisan test

# Specific suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Specific file
php artisan test tests/Unit/Models/UserGameTest.php

# With coverage (requires Xdebug)
php artisan test --coverage

# Parallel execution (faster on multi-core)
php artisan test --parallel
```

## CI Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. Lint (Pint, ESLint, Prettier)
2. Type checks (PHPStan, TypeScript)
3. PHPUnit tests (parallel execution)
4. Frontend build validation

Tests run on:
- Every push to `main`
- Every pull request
- PHP 8.3, SQLite in-memory database

## Testing Guidelines

### DOs

- **Use descriptive test names.** `test_user_can_hide_backlog_game()` is better than `test_hide()`.
- **Arrange-Act-Assert structure.** Set up data, perform action, verify outcome.
- **Test one thing per test.** If you need `and()`, consider splitting the test.
- **Use factories for setup.** Never manually create records with raw attributes.
- **Mock external APIs.** Steam, payment gateways, email services.
- **Seed realistic data.** Large libraries (100+ games), edge cases (removed games, zero playtime).

### DON'Ts

- **Don't test framework features.** Laravel's validation, Eloquent relationships, etc. are already tested.
- **Don't test private methods.** Test public behavior. If a private method needs testing, it might belong in its own class.
- **Don't mock the database.** Use `RefreshDatabase` and real queries. Mocking DB queries is brittle.
- **Don't test implementation details.** If you can refactor without changing tests, you're testing behavior (good).
- **Don't skip assertions.** Every test must have at least one assertion.

## Test Data Principles

### Minimal Setup

Only create what the test needs. If a test doesn't care about playtime, don't set it:

```php
// Good
$entry = UserGame::factory()->backlog()->create();

// Bad (unnecessary detail)
$entry = UserGame::factory()->create([
    'triage_status' => TriageStatus::Backlog,
    'playtime_forever' => 120,
    'playtime_2weeks' => 30,
    'last_played_at' => now()->subDays(3),
]);
```

### Explicit Intent

Override defaults only when the value matters for the test:

```php
// Good (zero playtime is the point)
test('games with zero playtime appear in triage', function () {
    $entry = UserGame::factory()->create(['playtime_forever' => 0]);
    // ...
});

// Bad (playtime isn't relevant)
test('user can hide a game', function () {
    $entry = UserGame::factory()->create(['playtime_forever' => 0]);
    // ...
});
```

### Realistic Fixtures

When mocking Steam API responses, use realistic data:
- Game counts: 0, 5, 100, 500 (common library sizes)
- Playtime: 0, 30 minutes, 10 hours, 1000 hours
- App IDs: Real Steam IDs (440 = TF2, 570 = Dota 2, 730 = CS:GO)

## Performance Targets

- Unit tests: < 100ms total
- Feature tests: < 5 seconds total
- Full suite: < 10 seconds (parallel execution)

If tests are slow:
1. Check for unnecessary DB queries (use `DB::enableQueryLog()`)
2. Reduce test data volume (create fewer records)
3. Use `RefreshDatabase` instead of `DatabaseTransactions` for parallel support
4. Run feature tests in parallel: `php artisan test --parallel`

## Future Enhancements

Deferred until after MVP launch:

- **Mutation testing** (Infection PHP) — verify test quality
- **Performance benchmarks** — track query counts, response times
- **Visual regression testing** (Percy, Chromatic) — catch UI breaks
- **Load testing** (k6, Locust) — validate sync performance under load

## References

- [Laravel Testing Docs](https://laravel.com/docs/testing)
- [PHPUnit Manual](https://phpunit.de/manual/current/en/index.html)
- [Steam Web API Documentation](https://steamcommunity.com/dev)
- Repository: [MXB-35](https://linear.app/steam-backlog/issue/MXB-35/test-strategy-setup)
