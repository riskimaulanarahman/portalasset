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
        Schema::create('materials', function (Blueprint $table) {
            $table->string('code', 25)->primary();
            $table->string('nama', 150);
            $table->string('type', 25)->nullable();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('unit', 10)->nullable();
            $table->string('matcode', 10)->nullable();
            $table->string('sn', 25)->nullable();
            $table->decimal('min_stock', 10, 1)->nullable();
            $table->decimal('price', 15, 2)->nullable();
            $table->decimal('stock', 10, 1)->default(0)->comment('Stok awal/opening stock');
            $table->string('pt', 150)->nullable();
            $table->foreignId('section_id')->constrained('sections')->restrictOnDelete();
            $table->boolean('not_active')->default(false);
            $table->string('create_by', 20)->nullable();
            $table->dateTime('create_date')->nullable();
            $table->string('update_by', 20)->nullable();
            $table->dateTime('update_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
