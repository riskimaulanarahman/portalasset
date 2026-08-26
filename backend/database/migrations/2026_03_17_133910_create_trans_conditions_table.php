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
        Schema::create('trans_conditions', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('reg_id', 10);
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
            $table->enum('kondisi', ['Good','Bad','Broken']);
            $table->text('remarks')->nullable();
            $table->string('create_by', 25);
            $table->dateTime('create_date');
            $table->string('update_by', 25)->nullable();
            $table->dateTime('update_date')->nullable();
            $table->index('reg_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trans_conditions');
    }
};
