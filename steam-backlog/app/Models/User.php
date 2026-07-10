<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['steam_id', 'display_name', 'avatar_url', 'last_synced_at', 'sync_status'])]
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
        ];
    }

    /**
     * Get the user's library entries.
     *
     * @return HasMany<UserGame, $this>
     */
    public function userGames(): HasMany
    {
        return $this->hasMany(UserGame::class);
    }
}
