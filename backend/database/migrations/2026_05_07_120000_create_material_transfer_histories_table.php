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
        Schema::create('material_transfer_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_id')->constrained('transfers')->cascadeOnDelete();
            $table->foreignId('transfer_item_id')->nullable()->constrained('transfer_items')->noActionOnDelete();
            $table->string('source_material_code', 25);
            $table->string('destination_material_code', 25);
            $table->foreignId('from_estate_id')->nullable()->constrained('estates')->noActionOnDelete();
            $table->foreignId('to_estate_id')->nullable()->constrained('estates')->noActionOnDelete();
            $table->decimal('qty', 10, 1);
            $table->boolean('destination_created')->default(false);
            $table->decimal('source_stock_before', 10, 1);
            $table->decimal('source_stock_after', 10, 1);
            $table->decimal('destination_stock_before', 10, 1);
            $table->decimal('destination_stock_after', 10, 1);
            $table->text('notes')->nullable();
            $table->string('processed_by', 100)->nullable();
            $table->dateTime('processed_at')->nullable();
            $table->timestamps();
            $table->index(['transfer_id', 'destination_created'], 'mth_transfer_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_transfer_histories');
    }
};
