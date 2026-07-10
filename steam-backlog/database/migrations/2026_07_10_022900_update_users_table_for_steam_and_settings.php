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
        Schema::dropIfExists('password_reset_tokens');
        
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('steam_id')->unique()->after('id');
            $table->string('display_name')->after('steam_id');
            $table->string('avatar_url')->after('display_name');
            $table->timestamp('last_synced_at')->nullable()->after('avatar_url');
            $table->enum('sync_status', ['idle', 'syncing', 'failed'])->default('idle')->after('last_synced_at');
            $table->enum('sync_frequency', ['manual', 'daily', 'weekly'])->default('daily')->after('sync_status');
            $table->json('privacy_preferences')->nullable()->after('sync_frequency');
        });
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->dropColumn(['name', 'email', 'email_verified_at', 'password']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['steam_id', 'display_name', 'avatar_url', 'last_synced_at', 'sync_status', 'sync_frequency', 'privacy_preferences']);
            
            $table->string('name')->after('id');
            $table->string('email')->unique()->after('name');
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->string('password')->after('email_verified_at');
        });
        
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }
};
