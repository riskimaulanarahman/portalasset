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
        Schema::create('asset_regs', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50)->nullable();
            $table->string('manufacture', 50)->nullable();
            $table->string('series', 50)->nullable();
            $table->string('matcode', 25)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
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
        Schema::dropIfExists('asset_regs');
    }
};
