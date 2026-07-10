<?php

namespace App\Http\Middleware;

use App\Support\SteamAuthConfig;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ConfigureSteamOpenId
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $returnUrlOverride = config('services.steam.return_url');
        $requestSchemeAndHost = $request->getSchemeAndHttpHost();

        $useRequestHost = blank($returnUrlOverride)
            || (app()->environment(['local', 'testing']) && ! self::hostsMatch($returnUrlOverride, $requestSchemeAndHost));

        $steamConfig = SteamAuthConfig::resolve(
            appUrl: (string) config('app.url'),
            returnUrlOverride: $useRequestHost ? null : $returnUrlOverride,
            realmOverride: config('services.steam.realm'),
            requestSchemeAndHost: $requestSchemeAndHost,
            useRequestHost: $useRequestHost,
            isProduction: app()->isProduction(),
        );

        config([
            'services.steam.redirect' => $steamConfig['redirect'],
            'services.steam.realm' => $steamConfig['realm'],
            'services.steam.force_https' => $steamConfig['force_https'],
        ]);

        return $next($request);
    }

    private static function hostsMatch(string $returnUrl, string $requestSchemeAndHost): bool
    {
        $configuredHost = parse_url($returnUrl, PHP_URL_HOST);
        $requestHost = parse_url($requestSchemeAndHost.'/', PHP_URL_HOST);

        if ($configuredHost === null || $requestHost === null) {
            return false;
        }

        $configuredPort = parse_url($returnUrl, PHP_URL_PORT);
        $requestPort = parse_url($requestSchemeAndHost.'/', PHP_URL_PORT);

        return $configuredHost === $requestHost && $configuredPort === $requestPort;
    }
}
