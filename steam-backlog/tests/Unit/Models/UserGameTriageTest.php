<?php

namespace Tests\Unit\Models;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit tests for UserGame model and triage logic.
 *
 * These tests demonstrate patterns for testing triage invariants,
 * board placement logic, and state transitions.
 *
 * NOTE: These tests are placeholders until the actual models and enums are implemented.
 * They show the expected testing approach and will need updates once the real
 * UserGame model, TriageStatus enum, and BoardColumn enum exist.
 *
 * Related: MXB-35 (Test strategy setup)
 */
class UserGameTriageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Example test structure for triage invariant enforcement.
     *
     * Invariant: board_column and board_position must be null when triage_status is 'hidden'.
     */
    public function test_hiding_library_entry_clears_board_placement(): void
    {
        $this->markTestSkipped('Placeholder until UserGame model is implemented (MXB-5)');

        // Arrange: Create a library entry on the board
        // $entry = UserGame::factory()->playing()->create();
        //
        // Act: Hide the entry
        // $entry->hide();
        //
        // Assert: Board fields are cleared
        // $this->assertSame('hidden', $entry->triage_status);
        // $this->assertNull($entry->board_column);
        // $this->assertNull($entry->board_position);
    }

    /**
     * Example test for triage status transition.
     *
     * Invariant: Marking a game as 'maybe' should clear board placement.
     */
    public function test_maybe_status_clears_board_placement(): void
    {
        $this->markTestSkipped('Placeholder until UserGame model is implemented (MXB-5)');

        // Arrange
        // $entry = UserGame::factory()->inQueue(position: 3)->create();
        //
        // Act
        // $entry->setTriageStatus('maybe');
        //
        // Assert
        // $this->assertSame('maybe', $entry->triage_status);
        // $this->assertNull($entry->board_column);
        // $this->assertNull($entry->board_position);
    }

    /**
     * Example test for board placement validation.
     *
     * Invariant: board_column and board_position can only be set when triage_status is 'backlog'.
     */
    public function test_board_placement_requires_backlog_status(): void
    {
        $this->markTestSkipped('Placeholder until UserGame model is implemented (MXB-5)');

        // Arrange
        // $entry = UserGame::factory()->unreviewed()->create();
        //
        // Act & Assert: Attempting to place on board should fail or auto-convert to backlog
        // $entry->placeOnBoard('playing', 0);
        //
        // $this->assertSame('backlog', $entry->triage_status);
        // $this->assertSame('playing', $entry->board_column);
        // $this->assertSame(0, $entry->board_position);
    }

    /**
     * Example test for board position management.
     *
     * When adding a game to a column, it should get the next available position.
     */
    public function test_new_entry_gets_next_board_position(): void
    {
        $this->markTestSkipped('Placeholder until UserGame model is implemented (MXB-5)');

        // Arrange: User has 2 games in 'playing' column
        // $user = User::factory()->create();
        // UserGame::factory()->for($user)->playing(position: 0)->create();
        // UserGame::factory()->for($user)->playing(position: 1)->create();
        //
        // Act: Add a third game to 'playing'
        // $newEntry = UserGame::factory()->for($user)->backlog()->create();
        // $newEntry->placeOnBoard('playing');
        //
        // Assert: New entry gets position 2
        // $this->assertSame(2, $newEntry->board_position);
    }

    /**
     * Example test for removed game preservation.
     *
     * Invariant: When a game is removed from Steam library, triage and board state are preserved.
     */
    public function test_removed_game_preserves_triage_state(): void
    {
        $this->markTestSkipped('Placeholder until UserGame model is implemented (MXB-5)');

        // Arrange
        // $entry = UserGame::factory()->playing(position: 1)->create();
        //
        // Act: Mark as removed (game dropped from GetOwnedGames)
        // $entry->markAsRemoved();
        //
        // Assert: Triage and board state unchanged
        // $this->assertNotNull($entry->removed_at);
        // $this->assertSame('backlog', $entry->triage_status);
        // $this->assertSame('playing', $entry->board_column);
        // $this->assertSame(1, $entry->board_position);
    }

    /**
     * Example test for sync idempotency.
     *
     * Invariant: Re-syncing a library entry updates playtime but never resets triage or board state.
     */
    public function test_sync_preserves_triage_decisions(): void
    {
        $this->markTestSkipped('Placeholder until sync logic is implemented (MXB-8, MXB-44)');

        // Arrange: User has triaged a game
        // $entry = UserGame::factory()->backlog()->create([
        //     'playtime_forever' => 120,
        // ]);
        //
        // Act: Sync updates playtime
        // $entry->updateFromSteamApi(['playtime_forever' => 240]);
        //
        // Assert: Triage preserved, playtime updated
        // $this->assertSame('backlog', $entry->triage_status);
        // $this->assertSame(240, $entry->playtime_forever);
    }

    /**
     * Example test for board reordering.
     *
     * Moving a game within a column should update positions correctly.
     */
    public function test_reordering_updates_positions(): void
    {
        $this->markTestSkipped('Placeholder until board logic is implemented (MXB-11)');

        // Arrange: Three games in 'queue' column
        // $user = User::factory()->create();
        // $game1 = UserGame::factory()->for($user)->inQueue(0)->create();
        // $game2 = UserGame::factory()->for($user)->inQueue(1)->create();
        // $game3 = UserGame::factory()->for($user)->inQueue(2)->create();
        //
        // Act: Move game3 to position 0
        // $game3->moveTo('queue', 0);
        //
        // Assert: Positions are reordered
        // $this->assertSame(1, $game1->fresh()->board_position);
        // $this->assertSame(2, $game2->fresh()->board_position);
        // $this->assertSame(0, $game3->fresh()->board_position);
    }
}
