<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SteamOpenIdRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_steam_redirect_uses_matching_return_url_and_realm(): void
    {
        config([
            'app.url' => 'http://localhost',
            'services.steam.return_url' => 'http://localhost/auth/steam/callback',
            'services.steam.realm' => 'http://localhost',
        ]);

        $response = $this->get('http://127.0.0.1:8000/auth/steam');

        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');

        $this->assertStringContainsString('steamcommunity.com/openid/login', $location);

        parse_str((string) parse_url($location, PHP_URL_QUERY), $params);

        $this->assertSame('http://127.0.0.1:8000/auth/steam/callback', $params['openid.return_to']);
        $this->assertSame('http://127.0.0.1:8000', $params['openid.realm']);
    }
}
