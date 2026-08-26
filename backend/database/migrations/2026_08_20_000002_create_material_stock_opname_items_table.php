<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_stock_opname_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opname_id')->constrained('material_stock_opnames')->cascadeOnDelete();
            $table->string('material_code', 25);
            $table->foreign('material_code')->references('code')->on('materials')->noActionOnDelete();
            $table->string('material_name', 150);
            $table->foreignId('category_id')->nullable()->constrained('categories')->noActionOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->noActionOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->noActionOnDelete();
            $table->decimal('system_stock_snapshot', 12, 1);
            $table->decimal('physical_stock', 12, 1)->nullable();
            $table->decimal('recount_stock', 12, 1)->nullable();
            $table->decimal('final_physical_stock', 12, 1)->nullable();
            $table->decimal('variance_qty', 12, 1)->default(0);
            $table->decimal('price_snapshot', 18, 2)->nullable();
            $table->decimal('variance_value', 18, 2)->default(0);
            $table->enum('variance_type', ['Match', 'Surplus', 'Shortage'])->default('Match');
            $table->enum('status', ['Open', 'Counted', 'Need Recount', 'Reviewed', 'Posted', 'Skipped'])->default('Open');
            $table->text('variance_reason')->nullable();
            $table->text('condition_note')->nullable();
            $table->decimal('stock_before_posting', 12, 1)->nullable();
            $table->decimal('stock_after_posting', 12, 1)->nullable();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->string('counted_by', 100)->nullable();
            $table->dateTime('counted_at')->nullable();
            $table->string('reviewed_by', 100)->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['opname_id', 'material_code']);
            $table->index(['material_code', 'status']);
            $table->index(['opname_id', 'variance_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_stock_opname_items');
    }
};
