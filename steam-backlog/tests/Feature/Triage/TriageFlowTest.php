<?php

namespace Tests\Feature\Triage;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for triage flow (review unreviewed games).
 *
 * These tests demonstrate the expected triage user experience:
 * viewing unreviewed games, making triage decisions (hide/maybe/backlog),
 * and placing games on the board.
 *
 * NOTE: Placeholder tests until triage routes and controllers are implemented.
 *
 * Related: MXB-35 (Test strategy setup)
 */
class TriageFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Example test for viewing triage page.
     *
     * Authenticated user should see their unreviewed games.
     */
    public function test_user_can_view_triage_page(): void
    {
        $this->markTestSkipped('Placeholder until triage views are implemented');

        // Arrange: User with unreviewed games
        // $user = User::factory()->create();
        // $game1 = Game::factory()->teamFortress2()->create();
        // $game2 = Game::factory()->dota2()->create();
        // UserGame::factory()->for($user)->for($game1)->unreviewed()->create();
        // UserGame::factory()->for($user)->for($game2)->unreviewed()->create();
        //
        // Act: Visit triage page
        // $response = $this->actingAs($user)->get(route('triage'));
        //
        // Assert: See both games
        // $response->assertOk();
        // $response->assertSee('Team Fortress 2');
        // $response->assertSee('Dota 2');
    }

    /**
     * Example test for hiding a game.
     *
     * User can mark a game as 'hidden' from triage view.
     */
    public function test_user_can_hide_game(): void
    {
        $this->markTestSkipped('Placeholder until triage actions are implemented');

        // Arrange
        // $user = User::factory()->create();
        // $game = Game::factory()->teamFortress2()->create();
        // $entry = UserGame::factory()->for($user)->for($game)->unreviewed()->create();
        //
        // Act: Hide the game
        // $response = $this->actingAs($user)
        //     ->post(route('triage.hide', $entry));
        //
        // Assert: Status updated, redirected to triage
        // $this->assertSame('hidden', $entry->fresh()->triage_status);
        // $response->assertRedirect(route('triage'));
    }

    /**
     * Example test for marking game as maybe.
     *
     * User can mark a game as 'maybe' (interested but not ready to commit).
     */
    public function test_user_can_mark_game_as_maybe(): void
    {
        $this->markTestSkipped('Placeholder until triage actions are implemented');

        // Arrange
        // $user = User::factory()->create();
        // $game = Game::factory()->baldursGate3()->create();
        // $entry = UserGame::factory()->for($user)->for($game)->unreviewed()->create();
        //
        // Act: Mark as maybe
        // $response = $this->actingAs($user)
        //     ->post(route('triage.maybe', $entry));
        //
        // Assert: Status updated
        // $this->assertSame('maybe', $entry->fresh()->triage_status);
        // $response->assertRedirect(route('triage'));
    }

    /**
     * Example test for adding game to backlog.
     *
     * User can mark a game as 'backlog' and optionally place it on the board.
     */
    public function test_user_can_add_game_to_backlog(): void
    {
        $this->markTestSkipped('Placeholder until triage actions are implemented');

        // Arrange
        // $user = User::factory()->create();
        // $game = Game::factory()->stardewValley()->create();
        // $entry = UserGame::factory()->for($user)->for($game)->unreviewed()->create();
        //
        // Act: Add to backlog in 'queue' column
        // $response = $this->actingAs($user)
        //     ->post(route('triage.backlog', $entry), [
        //         'board_column' => 'queue',
        //     ]);
        //
        // Assert: Status and board updated
        // $entry->refresh();
        // $this->assertSame('backlog', $entry->triage_status);
        // $this->assertSame('queue', $entry->board_column);
        // $this->assertSame(0, $entry->board_position);
        // $response->assertRedirect(route('triage'));
    }

    /**
     * Example test for triage with no unreviewed games.
     *
     * When all games are reviewed, show completion state.
     */
    public function test_triage_page_shows_completion_state(): void
    {
        $this->markTestSkipped('Placeholder until triage views are implemented');

        // Arrange: User with no unreviewed games
        // $user = User::factory()->create();
        // $game = Game::factory()->create();
        // UserGame::factory()->for($user)->for($game)->backlog()->create();
        //
        // Act: Visit triage page
        // $response = $this->actingAs($user)->get(route('triage'));
        //
        // Assert: See completion message
        // $response->assertOk();
        // $response->assertSee('All caught up');
    }

    /**
     * Example test for triage decision persistence.
     *
     * After hiding a game, it shouldn't appear in triage view.
     */
    public function test_hidden_games_not_shown_in_triage(): void
    {
        $this->markTestSkipped('Placeholder until triage views are implemented');

        // Arrange: User with one unreviewed and one hidden game
        // $user = User::factory()->create();
        // $game1 = Game::factory()->teamFortress2()->create();
        // $game2 = Game::factory()->dota2()->create();
        // UserGame::factory()->for($user)->for($game1)->unreviewed()->create();
        // UserGame::factory()->for($user)->for($game2)->hidden()->create();
        //
        // Act: Visit triage page
        // $response = $this->actingAs($user)->get(route('triage'));
        //
        // Assert: See only unreviewed game
        // $response->assertSee('Team Fortress 2');
        // $response->assertDontSee('Dota 2');
    }

    /**
     * Example test for authorization.
     *
     * User can only triage their own library entries.
     */
    public function test_user_cannot_triage_other_users_games(): void
    {
        $this->markTestSkipped('Placeholder until authorization is implemented');

        // Arrange: Two users
        // $user1 = User::factory()->create();
        // $user2 = User::factory()->create();
        // $game = Game::factory()->create();
        // $entry = UserGame::factory()->for($user2)->for($game)->unreviewed()->create();
        //
        // Act: user1 tries to hide user2's game
        // $response = $this->actingAs($user1)
        //     ->post(route('triage.hide', $entry));
        //
        // Assert: Forbidden
        // $response->assertForbidden();
        // $this->assertSame('unreviewed', $entry->fresh()->triage_status);
    }

    /**
     * Example test for validation.
     *
     * Board column must be valid when adding to backlog.
     */
    public function test_backlog_requires_valid_board_column(): void
    {
        $this->markTestSkipped('Placeholder until triage validation is implemented');

        // Arrange
        // $user = User::factory()->create();
        // $game = Game::factory()->create();
        // $entry = UserGame::factory()->for($user)->for($game)->unreviewed()->create();
        //
        // Act: Try to add with invalid column
        // $response = $this->actingAs($user)
        //     ->post(route('triage.backlog', $entry), [
        //         'board_column' => 'invalid',
        //     ]);
        //
        // Assert: Validation error
        // $response->assertSessionHasErrors('board_column');
        // $this->assertSame('unreviewed', $entry->fresh()->triage_status);
    }
}
