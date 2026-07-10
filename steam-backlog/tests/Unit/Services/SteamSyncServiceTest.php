<?php

namespace Tests\Unit\Services;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Helpers\SteamApiMock;
use Tests\TestCase;

/**
 * Unit tests for Steam library sync service.
 *
 * These tests demonstrate patterns for mocking Steam API responses
 * and testing sync logic in isolation.
 *
 * NOTE: Placeholder tests until sync service is implemented.
 *
 * Related: MXB-33 (Sync engine), MXB-35 (Test strategy)
 */
class SteamSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Example test for successful library sync.
     */
    public function test_sync_creates_new_library_entries(): void
    {
        $this->markTestSkipped('Placeholder until SteamSyncService is implemented (MXB-33)');

        // Arrange: Mock Steam API to return 5 games
        // SteamApiMock::smallLibrary();
        // $user = User::factory()->create();
        //
        // Act: Trigger sync
        // $service = app(SteamSyncService::class);
        // $service->syncLibrary($user);
        //
        // Assert: 5 library entries created
        // $this->assertSame(5, $user->libraryEntries()->count());
        // $this->assertSame('idle', $user->fresh()->sync_status);
        // $this->assertNotNull($user->fresh()->last_synced_at);
    }

    /**
     * Example test for sync with empty library.
     */
    public function test_sync_handles_empty_library(): void
    {
        $this->markTestSkipped('Placeholder until SteamSyncService is implemented (MXB-33)');

        // Arrange
        // SteamApiMock::emptyLibrary();
        // $user = User::factory()->create();
        //
        // Act
        // $service = app(SteamSyncService::class);
        // $service->syncLibrary($user);
        //
        // Assert: No entries created, sync marked successful
        // $this->assertSame(0, $user->libraryEntries()->count());
        // $this->assertSame('idle', $user->fresh()->sync_status);
    }

    /**
     * Example test for sync preserving triage decisions.
     *
     * Invariant: Re-sync updates playtime but never resets triage_status or board fields.
     */
    public function test_sync_preserves_triage_decisions(): void
    {
        $this->markTestSkipped('Placeholder until SteamSyncService is implemented (MXB-44)');

        // Arrange: User has triaged a game
        // $user = User::factory()->synced()->create();
        // $game = Game::factory()->teamFortress2()->create();
        // $entry = UserGame::factory()
        //     ->for($user)
        //     ->for($game)
        //     ->playing(position: 0)
        //     ->create(['playtime_forever' => 1000]);
        //
        // // Mock Steam API with updated playtime
        // SteamApiMock::ownedGames([
        //     ['appid' => 440, 'playtime_forever' => 2000],
        // ]);
        //
        // Act: Re-sync
        // $service = app(SteamSyncService::class);
        // $service->syncLibrary($user);
        //
        // Assert: Playtime updated, triage preserved
        // $entry->refresh();
        // $this->assertSame(2000, $entry->playtime_forever);
        // $this->assertSame('backlog', $entry->triage_status);
        // $this->assertSame('playing', $entry->board_column);
        // $this->assertSame(0, $entry->board_position);
    }

    /**
     * Example test for handling removed games.
     *
     * When a game disappears from GetOwnedGames, mark it as removed but preserve state.
     */
    public function test_sync_marks_removed_games(): void
    {
        $this->markTestSkipped('Placeholder until SteamSyncService is implemented (MXB-44)');

        // Arrange: User owns 2 games, then one is removed
        // $user = User::factory()->synced()->create();
        // $game1 = Game::factory()->teamFortress2()->create();
        // $game2 = Game::factory()->dota2()->create();
        // UserGame::factory()->for($user)->for($game1)->playing()->create();
        // $entry2 = UserGame::factory()->for($user)->for($game2)->inQueue()->create();
        //
        // // Mock Steam API with only game1
        // SteamApiMock::ownedGames([
        //     ['appid' => 440, 'playtime_forever' => 1000],
        // ]);
        //
        // Act: Sync
        // $service = app(SteamSyncService::class);
        // $service->syncLibrary($user);
        //
        // Assert: game2 entry marked as removed, state preserved
        // $entry2->refresh();
        // $this->assertNotNull($entry2->removed_at);
        // $this->assertSame('backlog', $entry2->triage_status);
        // $this->assertSame('queue', $entry2->board_column);
    }

    /**
     * Example test for Steam API failure handling.
     */
    public function test_sync_handles_api_failure(): void
    {
        $this->markTestSkipped('Placeholder until SteamSyncService is implemented (MXB-33)');

        // Arrange: Mock Steam API failure
        // SteamApiMock::failure('*', 503);
        // $user = User::factory()->create();
        //
        // Act: Attempt sync
        // $service = app(SteamSyncService::class);
        // $result = $service->syncLibrary($user);
        //
        // Assert: Sync marked as failed
        // $this->assertFalse($result);
        // $this->assertSame('failed', $user->fresh()->sync_status);
        // $this->assertNull($user->fresh()->last_synced_at);
    }

    /**
     * Example test for concurrent sync prevention.
     *
     * Multiple sync requests should be ignored if already syncing.
     */
    public function test_sync_prevents_concurrent_syncs(): void
    {
        $this->markTestSkipped('Placeholder until SteamSyncService is implemented (MXB-33)');

        // Arrange: User already syncing
        // $user = User::factory()->syncing()->create();
        //
        // Act: Attempt another sync
        // $service = app(SteamSyncService::class);
        // $result = $service->syncLibrary($user);
        //
        // Assert: Sync rejected
        // $this->assertFalse($result);
        // $this->assertSame('syncing', $user->fresh()->sync_status);
    }
}
