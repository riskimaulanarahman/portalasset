<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->string('opname_code', 40)->unique();
            $table->foreignId('estate_id')->constrained('estates')->noActionOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->noActionOnDelete();
            $table->date('opname_date');
            $table->dateTime('snapshot_at');
            $table->enum('status', [
                'Draft',
                'Counting',
                'Review',
                'Pending Approval',
                'Rejected',
                'Posted',
                'Cancelled',
            ])->default('Draft');
            $table->unsignedInteger('total_items')->default(0);
            $table->unsignedInteger('counted_items')->default(0);
            $table->decimal('total_variance_qty', 12, 1)->default(0);
            $table->decimal('total_variance_value', 18, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('created_by', 100)->nullable();
            $table->string('submitted_by', 100)->nullable();
            $table->dateTime('submitted_at')->nullable();
            $table->string('posted_by', 100)->nullable();
            $table->dateTime('posted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['estate_id', 'status']);
            $table->index(['opname_date', 'estate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_stock_opnames');
    }
};
