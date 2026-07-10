<?php

namespace Tests\Helpers;

/**
 * Common test helpers and utilities.
 */
class TestHelpers
{
    /**
     * Create a test Steam ID.
     */
    public static function fakeSteamId(): string
    {
        return '7656119' . rand(7000000000, 7999999999);
    }

    /**
     * Create a test Steam app ID.
     */
    public static function fakeAppId(): int
    {
        return rand(10000, 2999999);
    }

    /**
     * Create a timestamp for recent playtime.
     */
    public static function recentPlaytime(): int
    {
        return time() - rand(0, 86400 * 7);
    }

    /**
     * Create a timestamp for old playtime.
     */
    public static function oldPlaytime(): int
    {
        return time() - rand(86400 * 365, 86400 * 730);
    }

    /**
     * Assert JSON structure matches expected shape.
     */
    public static function assertJsonShape(array $expected, array $actual): void
    {
        foreach ($expected as $key => $type) {
            if (! array_key_exists($key, $actual)) {
                throw new \Exception("Missing key: {$key}");
            }

            $value = $actual[$key];

            match ($type) {
                'string' => is_string($value) ?: throw new \Exception("{$key} is not a string"),
                'int' => is_int($value) ?: throw new \Exception("{$key} is not an int"),
                'bool' => is_bool($value) ?: throw new \Exception("{$key} is not a bool"),
                'array' => is_array($value) ?: throw new \Exception("{$key} is not an array"),
                'null' => is_null($value) ?: throw new \Exception("{$key} is not null"),
                default => null,
            };
        }
    }
}
