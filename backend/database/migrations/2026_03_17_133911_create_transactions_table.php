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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('code', 25)->comment('Material code');
            $table->foreign('code')->references('code')->on('materials')->noActionOnDelete();
            $table->enum('type', ['IN','OUT']);
            $table->decimal('qty', 10, 1);
            $table->string('uav_id', 25)->nullable();
            $table->string('sap1', 15)->nullable();
            $table->string('nama1', 50)->nullable();
            $table->string('sap2', 15)->nullable();
            $table->string('nama2', 50)->nullable();
            $table->string('section', 25)->nullable();
            $table->string('estate', 50)->nullable();
            $table->string('attachment', 50)->nullable();
            $table->text('keterangan')->nullable();
            $table->string('store', 10)->nullable()->comment('CRW atau default');
            $table->string('create_by', 25);
            $table->dateTime('create_date')->nullable();
            $table->string('update_by', 25)->nullable();
            $table->dateTime('update_date')->nullable();
            $table->index(['code', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
