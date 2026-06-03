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
        Schema::create('anggotas', function (Blueprint $table) {
            $table->string('sap_id', 15)->primary();
            $table->string('nik', 15)->nullable();
            $table->string('nama', 25)->nullable();
            $table->string('position', 25)->nullable();
            $table->string('supervisor', 25)->nullable();
            $table->string('email', 50)->nullable();
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
        Schema::dropIfExists('anggotas');
    }
};
