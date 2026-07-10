<?php

namespace Database\Factories;

use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory for Game model.
 *
 * Games represent Steam apps in the shared catalog.
 * One row per app_id, updated during library sync.
 *
 * @extends Factory<Game>
 */
class GameFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'app_id' => $this->faker->unique()->numberBetween(10000, 2999999),
            'name' => $this->faker->words(rand(2, 4), true),
            'header_image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg',
        ];
    }

    /**
     * Real Steam game (Team Fortress 2).
     */
    public function teamFortress2(): static
    {
        return $this->state([
            'app_id' => 440,
            'name' => 'Team Fortress 2',
            'header_image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg',
        ]);
    }

    /**
     * Real Steam game (Dota 2).
     */
    public function dota2(): static
    {
        return $this->state([
            'app_id' => 570,
            'name' => 'Dota 2',
            'header_image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
        ]);
    }

    /**
     * Real Steam game (CS2).
     */
    public function counterStrike2(): static
    {
        return $this->state([
            'app_id' => 730,
            'name' => 'Counter-Strike 2',
            'header_image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
        ]);
    }

    /**
     * Real Steam game (Stardew Valley).
     */
    public function stardewValley(): static
    {
        return $this->state([
            'app_id' => 413150,
            'name' => 'Stardew Valley',
            'header_image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg',
        ]);
    }

    /**
     * Real Steam game (Baldur's Gate 3).
     */
    public function baldursGate3(): static
    {
        return $this->state([
            'app_id' => 1086940,
            'name' => "Baldur's Gate 3",
            'header_image_url' => 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
        ]);
    }
}
