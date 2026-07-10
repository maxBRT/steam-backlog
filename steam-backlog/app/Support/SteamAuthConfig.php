<?php

namespace App\Support;

class SteamAuthConfig
{
    /**
     * Resolve the Steam OpenID callback URL.
     *
     * Steam rejects login when openid.return_to is not under openid.realm.
     * In local dev, APP_URL often disagrees with the browser host (localhost vs 127.0.0.1).
     */
    public static function resolveReturnUrl(
        string $appUrl,
        ?string $returnUrlOverride,
        ?string $requestSchemeAndHost,
        bool $useRequestHost,
    ): string {
        if ($returnUrlOverride !== null && $returnUrlOverride !== '') {
            return $returnUrlOverride;
        }

        if ($useRequestHost && $requestSchemeAndHost !== null && $requestSchemeAndHost !== '') {
            return rtrim($requestSchemeAndHost, '/').'/auth/steam/callback';
        }

        return rtrim($appUrl, '/').'/auth/steam/callback';
    }

    /**
     * Resolve the Steam OpenID realm host.
     *
     * The Socialite Steam provider formats realm as "{scheme}://{host}", so this must be
     * host[:port] only. Legacy configs sometimes set STEAM_REALM to a full APP_URL.
     */
    public static function resolveRealmHost(string $returnUrl, ?string $realmOverride): string
    {
        $returnHost = self::hostFromUrl($returnUrl);

        if ($realmOverride !== null && $realmOverride !== '') {
            $configuredHost = self::normalizeRealmHost($realmOverride);

            if ($configuredHost === $returnHost) {
                return $configuredHost;
            }
        }

        return $returnHost;
    }

    /**
     * @return array{redirect: string, realm: string, force_https: bool}
     */
    public static function resolve(string $appUrl, ?string $returnUrlOverride, ?string $realmOverride, ?string $requestSchemeAndHost, bool $useRequestHost, bool $isProduction): array
    {
        $redirect = self::resolveReturnUrl($appUrl, $returnUrlOverride, $requestSchemeAndHost, $useRequestHost);
        $realm = self::resolveRealmHost($redirect, $realmOverride);

        return [
            'redirect' => $redirect,
            'realm' => $realm,
            'force_https' => $isProduction && str_starts_with($redirect, 'https://'),
        ];
    }

    private static function normalizeRealmHost(string $realm): string
    {
        if (! str_contains($realm, '://')) {
            return $realm;
        }

        return self::hostFromUrl($realm);
    }

    private static function hostFromUrl(string $url): string
    {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? 'localhost';

        if (isset($parsed['port'])) {
            $host .= ':'.$parsed['port'];
        }

        return $host;
    }
}
