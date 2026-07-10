<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for User model.
 *
 * Users authenticate via Steam OpenID only (no email or password).
 * Profile data comes from Steam Web API.
 *
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Steam users have no email or password.
     * sync_status defaults to 'idle'.
     */
    public function definition(): array
    {
        return [
            'steam_id' => '7656119' . $this->faker->unique()->numberBetween(7000000000, 7999999999),
            'display_name' => $this->faker->userName(),
            'avatar_url' => 'https://avatars.steamstatic.com/test_full.jpg',
            'last_synced_at' => null,
            'sync_status' => 'idle',
        ];
    }

    /**
     * User with a recently synced library.
     */
    public function synced(): static
    {
        return $this->state([
            'last_synced_at' => now()->subMinutes(rand(5, 60)),
            'sync_status' => 'idle',
        ]);
    }

    /**
     * User currently syncing their library.
     */
    public function syncing(): static
    {
        return $this->state([
            'sync_status' => 'syncing',
        ]);
    }

    /**
     * User whose last sync failed.
     */
    public function syncFailed(): static
    {
        return $this->state([
            'sync_status' => 'failed',
            'last_synced_at' => now()->subHours(rand(1, 24)),
        ]);
    }

    /**
     * User with a specific Steam ID.
     */
    public function withSteamId(string $steamId): static
    {
        return $this->state([
            'steam_id' => $steamId,
        ]);
    }
}

