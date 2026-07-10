<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'steam_id' => 76561197960287930,
            'display_name' => 'Test User',
            'avatar_url' => 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
            'sync_status' => 'idle',
            'sync_frequency' => 'daily',
            'privacy_preferences' => [
                'show_profile' => true,
                'show_playtime' => true,
                'share_activity' => true,
            ],
        ]);
    }
}
