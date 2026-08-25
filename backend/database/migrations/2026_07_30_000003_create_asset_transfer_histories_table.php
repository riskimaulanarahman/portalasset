<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_transfer_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_id')->constrained('transfers')->cascadeOnDelete();
            $table->foreignId('transfer_item_id')->nullable()->constrained('transfer_items')->noActionOnDelete();
            $table->string('asset_id');
            $table->foreignId('from_estate_id')->nullable()->constrained('estates')->noActionOnDelete();
            $table->foreignId('to_estate_id')->nullable()->constrained('estates')->noActionOnDelete();
            $table->string('previous_unit_id', 25)->nullable();
            $table->string('new_unit_id', 25)->nullable();
            $table->string('previous_anggota_id', 15)->nullable();
            $table->string('target_anggota_id', 15)->nullable();
            $table->text('notes')->nullable();
            $table->string('processed_by', 50)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['asset_id', 'processed_at'], 'asset_transfer_asset_processed_idx');
            $table->unique(['transfer_item_id', 'asset_id'], 'asset_transfer_item_asset_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_transfer_histories');
    }
};
