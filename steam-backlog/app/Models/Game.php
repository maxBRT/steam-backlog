<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $app_id
 * @property string $name
 * @property string $header_image_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['app_id', 'name', 'header_image_url'])]
class Game extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'app_id' => 'integer',
        ];
    }

    /**
     * Get the user library entries for this game.
     *
     * @return HasMany<UserGame, $this>
     */
    public function userGames(): HasMany
    {
        return $this->hasMany(UserGame::class);
    }
}
