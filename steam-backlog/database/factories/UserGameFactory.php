<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for UserGame model.
 *
 * UserGame represents a library entry (user's ownership of a game).
 * Holds triage status, board placement, playtime, and removal state.
 *
 * IMPORTANT: Factories for enums will need adjustment once actual enum classes exist.
 * For now, using string representations following the data model.
 *
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserGame>
 */
class UserGameFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Defaults to unreviewed (new library entry).
     */
    public function definition(): array
    {
        return [
            'triage_status' => 'unreviewed',
            'board_column' => null,
            'board_position' => null,
            'playtime_forever' => $this->faker->numberBetween(0, 10000),
            'playtime_2weeks' => 0,
            'last_played_at' => null,
            'removed_at' => null,
        ];
    }

    /**
     * Unreviewed library entry (default state).
     */
    public function unreviewed(): static
    {
        return $this->state([
            'triage_status' => 'unreviewed',
            'board_column' => null,
            'board_position' => null,
        ]);
    }

    /**
     * Hidden library entry.
     * Invariant: board fields must be null when hidden.
     */
    public function hidden(): static
    {
        return $this->state([
            'triage_status' => 'hidden',
            'board_column' => null,
            'board_position' => null,
        ]);
    }

    /**
     * Maybe library entry (interested but not ready to commit).
     * Invariant: board fields must be null when maybe.
     */
    public function maybe(): static
    {
        return $this->state([
            'triage_status' => 'maybe',
            'board_column' => null,
            'board_position' => null,
        ]);
    }

    /**
     * Backlog library entry (not yet on board).
     */
    public function backlog(): static
    {
        return $this->state([
            'triage_status' => 'backlog',
            'board_column' => null,
            'board_position' => null,
        ]);
    }

    /**
     * Library entry placed on board.
     * Invariant: board placement only valid when triage_status is backlog.
     */
    public function onBoard(string $column, ?int $position = null): static
    {
        return $this->state([
            'triage_status' => 'backlog',
            'board_column' => $column,
            'board_position' => $position ?? 0,
        ]);
    }

    /**
     * Library entry in queue column.
     */
    public function inQueue(?int $position = null): static
    {
        return $this->onBoard('queue', $position);
    }

    /**
     * Library entry in up_next column.
     */
    public function upNext(?int $position = null): static
    {
        return $this->onBoard('up_next', $position);
    }

    /**
     * Library entry in playing column.
     */
    public function playing(?int $position = null): static
    {
        return $this->onBoard('playing', $position);
    }

    /**
     * Library entry in done column.
     */
    public function done(?int $position = null): static
    {
        return $this->onBoard('done', $position);
    }

    /**
     * Library entry with zero playtime (never played).
     */
    public function neverPlayed(): static
    {
        return $this->state([
            'playtime_forever' => 0,
            'playtime_2weeks' => 0,
            'last_played_at' => null,
        ]);
    }

    /**
     * Library entry with recent playtime.
     */
    public function recentlyPlayed(?int $minutes = null): static
    {
        $playtime = $minutes ?? $this->faker->numberBetween(30, 500);

        return $this->state([
            'playtime_forever' => $playtime,
            'playtime_2weeks' => min($playtime, $this->faker->numberBetween(30, 300)),
            'last_played_at' => now()->subDays(rand(1, 7)),
        ]);
    }

    /**
     * Library entry with lots of playtime (dedicated player).
     */
    public function heavilyPlayed(?int $minutes = null): static
    {
        return $this->state([
            'playtime_forever' => $minutes ?? $this->faker->numberBetween(6000, 30000),
            'playtime_2weeks' => 0,
            'last_played_at' => now()->subMonths(rand(1, 12)),
        ]);
    }

    /**
     * Library entry removed from Steam library.
     * Invariant: triage and board state are preserved when removed.
     */
    public function removed(): static
    {
        return $this->state([
            'removed_at' => now()->subDays(rand(1, 30)),
        ]);
    }
}
