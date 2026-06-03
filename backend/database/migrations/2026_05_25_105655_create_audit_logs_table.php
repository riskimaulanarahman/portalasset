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
        // #8 FIX: Tabel audit trail untuk melacak semua perubahan data penting
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('model_type');           // e.g. "App\Models\Asset"
            $table->string('model_id');             // PK dari model (string untuk support custom PK)
            $table->string('action');               // created | updated | deleted | restored
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('username')->nullable(); // cached display name
            $table->json('old_values')->nullable(); // nilai sebelum perubahan
            $table->json('new_values')->nullable(); // nilai setelah perubahan
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['model_type', 'model_id']);
            $table->index('user_id');
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
