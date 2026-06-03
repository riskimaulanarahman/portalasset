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
        Schema::create('cost_centers', function (Blueprint $table) {
            $table->id();
            $table->string('cost_center', 10);
            $table->string('dept', 30);
            $table->string('estate', 10);
            $table->string('join_estate', 10)->default('HO');
            $table->string('created_by', 20);
            $table->dateTime('created_date');
            $table->string('update_by', 20)->nullable();
            $table->dateTime('update_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cost_centers');
    }
};
