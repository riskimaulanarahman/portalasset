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
        Schema::create('assets', function (Blueprint $table) {
            $table->string('reg_id', 10)->primary();
            $table->string('asset_no', 25)->nullable();
            $table->string('unit_id', 25)->nullable();
            $table->date('date')->nullable();
            $table->text('serial_no')->nullable();
            $table->foreignId('type_id')->nullable()->constrained('asset_regs')->nullOnDelete();
            $table->string('type', 25);
            $table->string('manufacture', 50);
            $table->string('series', 25);
            $table->foreignId('section_id')->constrained('sections')->restrictOnDelete();
            $table->string('alokasi', 10)->nullable();
            $table->text('keterangan')->nullable();
            $table->text('vendor')->nullable();
            $table->text('attachment')->nullable();
            $table->boolean('not_active')->default(false);
            $table->string('create_by', 20)->nullable();
            $table->dateTime('create_date')->nullable();
            $table->string('update_by', 20)->nullable();
            $table->dateTime('update_date')->nullable();
            $table->string('source', 20)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
