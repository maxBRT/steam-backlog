<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('game_id')->constrained()->onDelete('restrict');
            $table->enum('triage_status', ['unreviewed', 'hidden', 'maybe', 'backlog'])->default('unreviewed');
            $table->enum('board_column', ['queue', 'up_next', 'playing', 'done'])->nullable();
            $table->unsignedInteger('board_position')->nullable();
            $table->unsignedInteger('playtime_forever')->default(0);
            $table->unsignedInteger('playtime_2weeks')->default(0);
            $table->timestamp('last_played_at')->nullable();
            $table->timestamp('removed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'game_id']);
            $table->unique(['user_id', 'board_column', 'board_position'], 'user_board_position_unique')
                ->whereNotNull('board_column');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_games');
    }
};
