<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $steam_id
 * @property string $display_name
 * @property string $avatar_url
 * @property Carbon|null $last_synced_at
 * @property string $sync_status
 * @property string $sync_frequency
 * @property array|null $privacy_preferences
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['steam_id', 'display_name', 'avatar_url', 'last_synced_at', 'sync_status', 'sync_frequency', 'privacy_preferences'])]
#[Hidden(['remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'steam_id' => 'integer',
            'last_synced_at' => 'datetime',
            'privacy_preferences' => 'array',
        ];
    }
}
