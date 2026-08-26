<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // assets.reg_id sudah varchar(20) sejak migration 2026_03_31_155632
        // Sesuaikan semua FK child tables agar konsisten

        Schema::table('trans_conditions', function (Blueprint $table) {
            $table->dropForeign(['reg_id']);
            $table->string('reg_id', 20)->change();
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
        });

        Schema::table('trans_maintenances', function (Blueprint $table) {
            $table->dropForeign(['reg_id']);
            $table->string('reg_id', 20)->change();
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
        });

        Schema::table('trans_assets', function (Blueprint $table) {
            $table->dropForeign(['reg_id']);
            $table->string('reg_id', 20)->change();
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('trans_conditions', function (Blueprint $table) {
            $table->dropForeign(['reg_id']);
            $table->string('reg_id', 10)->change();
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
        });

        Schema::table('trans_maintenances', function (Blueprint $table) {
            $table->dropForeign(['reg_id']);
            $table->string('reg_id', 10)->change();
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
        });

        Schema::table('trans_assets', function (Blueprint $table) {
            $table->dropForeign(['reg_id']);
            $table->string('reg_id', 10)->change();
            $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
        });
    }
};
