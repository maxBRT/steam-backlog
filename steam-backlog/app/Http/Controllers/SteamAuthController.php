<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse as IlluminateRedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class SteamAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('steam')->redirect();
    }

    public function callback(): IlluminateRedirectResponse
    {
        $steamUser = Socialite::driver('steam')->user();

        $user = User::updateOrCreate(
            ['steam_id' => $steamUser->getId()],
            [
                'display_name' => $steamUser->getNickname() ?? $steamUser->getName(),
                'avatar_url' => $steamUser->getAvatar(),
            ]
        );

        Auth::login($user, remember: true);

        return redirect()->route('home');
    }

    public function logout(): IlluminateRedirectResponse
    {
        Auth::logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('home');
    }
}
