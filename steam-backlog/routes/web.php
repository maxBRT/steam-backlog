<?php

use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SteamAuthController;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware('steam.openid')->group(function () {
    Route::get('/auth/steam', [SteamAuthController::class, 'redirect'])->name('auth.steam');
    Route::get('/auth/steam/callback', [SteamAuthController::class, 'callback'])->name('auth.steam.callback');
});
Route::post('/auth/logout', [SteamAuthController::class, 'logout'])->name('auth.logout');
Route::get('/test-login', function () {
    $user = User::first();
    if ($user) {
        Auth::login($user);

        return redirect('/settings');
    }

    return 'No user found. Run: php artisan db:seed';
});

Route::middleware('auth')->group(function () {
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings/sync-frequency', [SettingsController::class, 'updateSyncFrequency'])->name('settings.sync-frequency');
    Route::post('/settings/privacy', [SettingsController::class, 'updatePrivacyPreferences'])->name('settings.privacy');
    Route::get('/settings/export', [SettingsController::class, 'exportData'])->name('settings.export');
    Route::delete('/settings/account', [SettingsController::class, 'destroy'])->name('settings.destroy');
});
