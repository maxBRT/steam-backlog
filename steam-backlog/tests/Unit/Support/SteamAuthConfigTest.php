<?php

namespace Tests\Unit\Support;

use App\Support\SteamAuthConfig;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SteamAuthConfigTest extends TestCase
{
    public function test_local_dev_ignores_localhost_return_url_when_request_uses_loopback_ip(): void
    {
        $returnUrl = SteamAuthConfig::resolveReturnUrl(
            appUrl: 'http://localhost',
            returnUrlOverride: 'http://localhost/auth/steam/callback',
            requestSchemeAndHost: 'http://127.0.0.1:8000',
            useRequestHost: true,
        );

        $this->assertSame('http://127.0.0.1:8000/auth/steam/callback', $returnUrl);
    }

    public function test_local_dev_uses_request_host_when_return_url_not_set(): void
    {
        $returnUrl = SteamAuthConfig::resolveReturnUrl(
            appUrl: 'http://localhost',
            returnUrlOverride: null,
            requestSchemeAndHost: 'http://127.0.0.1:8000',
            useRequestHost: true,
        );

        $this->assertSame('http://127.0.0.1:8000/auth/steam/callback', $returnUrl);
    }

    public function test_production_uses_app_url_when_return_url_not_set(): void
    {
        $returnUrl = SteamAuthConfig::resolveReturnUrl(
            appUrl: 'https://steam-backlog.example',
            returnUrlOverride: null,
            requestSchemeAndHost: 'http://internal-host',
            useRequestHost: false,
        );

        $this->assertSame('https://steam-backlog.example/auth/steam/callback', $returnUrl);
    }

    public function test_explicit_return_url_override_is_used(): void
    {
        $returnUrl = SteamAuthConfig::resolveReturnUrl(
            appUrl: 'http://localhost',
            returnUrlOverride: 'https://steam-backlog.example/auth/steam/callback',
            requestSchemeAndHost: 'http://127.0.0.1:8000',
            useRequestHost: true,
        );

        $this->assertSame('https://steam-backlog.example/auth/steam/callback', $returnUrl);
    }

    #[DataProvider('realmHostProvider')]
    public function test_realm_host_is_normalized(string $returnUrl, ?string $realmOverride, string $expectedRealm): void
    {
        $realmHost = SteamAuthConfig::resolveRealmHost($returnUrl, $realmOverride);

        $this->assertSame($expectedRealm, $realmHost);
    }

    /**
     * @return array<string, array{0: string, 1: ?string, 2: string}>
     */
    public static function realmHostProvider(): array
    {
        return [
            'derived from return url' => [
                'https://steam-backlog.example/auth/steam/callback',
                null,
                'steam-backlog.example',
            ],
            'derived from return url with port' => [
                'http://127.0.0.1:8000/auth/steam/callback',
                null,
                '127.0.0.1:8000',
            ],
            'legacy full url realm override' => [
                'https://steam-backlog.example/auth/steam/callback',
                'https://steam-backlog.example',
                'steam-backlog.example',
            ],
            'mismatched legacy realm falls back to return url host' => [
                'http://127.0.0.1:8000/auth/steam/callback',
                'http://localhost',
                '127.0.0.1:8000',
            ],
            'host-only realm override' => [
                'https://steam-backlog.example/auth/steam/callback',
                'steam-backlog.example',
                'steam-backlog.example',
            ],
        ];
    }

    public function test_resolve_aligns_realm_with_return_url(): void
    {
        $config = SteamAuthConfig::resolve(
            appUrl: 'http://localhost',
            returnUrlOverride: null,
            realmOverride: 'http://localhost',
            requestSchemeAndHost: 'http://127.0.0.1:8000',
            useRequestHost: true,
            isProduction: false,
        );

        $this->assertSame('http://127.0.0.1:8000/auth/steam/callback', $config['redirect']);
        $this->assertSame('127.0.0.1:8000', $config['realm']);
        $this->assertFalse($config['force_https']);
    }
}
