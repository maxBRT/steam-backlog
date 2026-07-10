# Tests

Test suite for Steam Backlog MVP. See [`docs/test-strategy.md`](../docs/test-strategy.md) for comprehensive testing guidelines.

## Quick Start

```bash
# Run all tests
composer test

# Run just PHPUnit
php artisan test

# Run specific suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Run specific file
php artisan test tests/Unit/Models/UserGameTriageTest.php
```

## Structure

```
tests/
├── Feature/          # HTTP endpoint tests
│   ├── Auth/         # Steam OpenID login/logout
│   ├── Triage/       # Triage flow and actions
│   └── Sync/         # Library sync endpoints
├── Unit/             # Domain logic tests
│   ├── Models/       # Model methods and scopes
│   └── Services/     # Business logic services
├── Fixtures/         # Test data
│   └── Steam/        # Steam API response fixtures
└── Helpers/          # Test utilities
    ├── SteamApiMock.php    # Steam API mocking
    └── TestHelpers.php     # Common utilities
```

## Steam API Mocking

Always mock Steam API calls in tests:

```php
use Tests\Helpers\SteamApiMock;

// Mock owned games
SteamApiMock::smallLibrary();  // Use fixture
SteamApiMock::ownedGames([...]);  // Custom data

// Mock player profile
SteamApiMock::singlePlayer();

// Mock API failure
SteamApiMock::failure('*', 503);
```

## Test Data Factories

Use factories to create valid domain objects:

```php
// Create with defaults
$user = User::factory()->create();
$game = Game::factory()->create();
$entry = UserGame::factory()->create();

// Use states
$entry = UserGame::factory()->backlog()->playing()->create();
$entry = UserGame::factory()->hidden()->create();
$entry = UserGame::factory()->neverPlayed()->create();

// Override specific fields
$entry = UserGame::factory()->create([
    'playtime_forever' => 0,
]);
```

## Placeholder Tests

Many tests are currently marked as `markTestSkipped()` because they demonstrate patterns for features not yet implemented. These will be activated as the corresponding features are built.

## CI Integration

Tests run automatically on:
- Every push to `main`
- Every pull request

GitHub Actions workflow: `.github/workflows/ci.yml`
