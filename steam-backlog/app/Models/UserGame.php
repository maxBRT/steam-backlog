<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $game_id
 * @property string $triage_status
 * @property string|null $board_column
 * @property int|null $board_position
 * @property int $playtime_forever
 * @property int $playtime_2weeks
 * @property Carbon|null $last_played_at
 * @property Carbon|null $removed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'game_id',
    'triage_status',
    'board_column',
    'board_position',
    'playtime_forever',
    'playtime_2weeks',
    'last_played_at',
    'removed_at',
])]
class UserGame extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'playtime_forever' => 'integer',
            'playtime_2weeks' => 'integer',
            'last_played_at' => 'datetime',
            'removed_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns this library entry.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the game for this library entry.
     *
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
