<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Display the account settings page.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('settings/index', [
            'user' => $request->user(),
        ]);
    }

    /**
     * Update the user's sync frequency setting.
     */
    public function updateSyncFrequency(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sync_frequency' => 'required|in:manual,daily,weekly',
        ]);

        $request->user()->update([
            'sync_frequency' => $validated['sync_frequency'],
        ]);

        return back()->with('success', 'Sync frequency updated successfully.');
    }

    /**
     * Update the user's privacy preferences.
     */
    public function updatePrivacyPreferences(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'privacy_preferences' => 'required|array',
            'privacy_preferences.show_profile' => 'boolean',
            'privacy_preferences.show_playtime' => 'boolean',
            'privacy_preferences.share_activity' => 'boolean',
        ]);

        $request->user()->update([
            'privacy_preferences' => $validated['privacy_preferences'],
        ]);

        return back()->with('success', 'Privacy preferences updated successfully.');
    }

    /**
     * Export the user's data as JSON.
     */
    public function exportData(Request $request)
    {
        $user = $request->user();
        
        $data = [
            'user' => [
                'steam_id' => $user->steam_id,
                'display_name' => $user->display_name,
                'avatar_url' => $user->avatar_url,
                'sync_frequency' => $user->sync_frequency,
                'privacy_preferences' => $user->privacy_preferences,
                'last_synced_at' => $user->last_synced_at?->toIso8601String(),
                'created_at' => $user->created_at->toIso8601String(),
                'updated_at' => $user->updated_at->toIso8601String(),
            ],
        ];

        $filename = 'steam-backlog-data-' . $user->steam_id . '-' . now()->format('Y-m-d-His') . '.json';

        return response()->json($data)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'confirmation' => 'required|string|in:DELETE',
        ]);

        $user = $request->user();
        
        Auth::logout();
        
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'Your account has been deleted.');
    }
}
