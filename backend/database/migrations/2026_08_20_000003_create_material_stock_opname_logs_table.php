<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_stock_opname_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opname_id')->constrained('material_stock_opnames')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('material_stock_opname_items')->noActionOnDelete();
            $table->string('action', 50);
            $table->string('actor', 100)->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['opname_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_stock_opname_logs');
    }
};
