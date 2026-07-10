<?php

namespace Tests\Helpers;

use Illuminate\Support\Facades\Http;

/**
 * Mock helper for Steam Web API responses.
 *
 * Use in tests to fake Steam API calls without hitting real endpoints.
 * Based on Steam Web API documentation: https://steamcommunity.com/dev
 */
class SteamApiMock
{
    /**
     * Mock GetOwnedGames API response.
     *
     * @param  array  $games  Array of game objects with app_id, playtime_forever, etc.
     */
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

    /**
     * Mock GetPlayerSummaries API response.
     *
     * @param  array  $players  Array of player objects with steamid, personaname, avatarfull, etc.
     */
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

    /**
     * Mock Steam API failure (timeout, 500, etc).
     */
    public static function failure(string $pattern = '*', int $status = 500): void
    {
        Http::fake([
            $pattern => Http::response([], $status),
        ]);
    }

    /**
     * Load fixture data from tests/Fixtures/Steam/.
     */
    public static function fixtureGames(string $fixture): array
    {
        $path = base_path("tests/Fixtures/Steam/{$fixture}.json");

        if (! file_exists($path)) {
            throw new \RuntimeException("Fixture not found: {$fixture}.json");
        }

        return json_decode(file_get_contents($path), true);
    }

    /**
     * Mock empty library (zero owned games).
     */
    public static function emptyLibrary(): void
    {
        self::ownedGames([]);
    }

    /**
     * Mock small library from fixture.
     */
    public static function smallLibrary(): void
    {
        self::ownedGames(self::fixtureGames('owned_games_small')['games']);
    }

    /**
     * Mock large library from fixture.
     */
    public static function largeLibrary(): void
    {
        self::ownedGames(self::fixtureGames('owned_games_large')['games']);
    }

    /**
     * Mock a single player profile.
     */
    public static function singlePlayer(array $overrides = []): void
    {
        $player = array_merge([
            'steamid' => '76561197960435530',
            'personaname' => 'Test Player',
            'profileurl' => 'https://steamcommunity.com/id/testplayer/',
            'avatar' => 'https://avatars.steamstatic.com/test_medium.jpg',
            'avatarmedium' => 'https://avatars.steamstatic.com/test_medium.jpg',
            'avatarfull' => 'https://avatars.steamstatic.com/test_full.jpg',
            'personastate' => 1,
            'communityvisibilitystate' => 3,
            'profilestate' => 1,
            'lastlogoff' => time() - 3600,
            'timecreated' => time() - 31536000,
        ], $overrides);

        self::playerSummaries([$player]);
    }
}
