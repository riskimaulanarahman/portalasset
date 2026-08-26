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
        foreach (['trans_assets', 'trans_maintenances', 'trans_conditions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['reg_id']);
            });
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropPrimary(['reg_id']);
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->string('reg_id', 20)->change();
        });

        foreach (['trans_assets', 'trans_maintenances', 'trans_conditions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('reg_id', 20)->change();
            });
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->primary('reg_id');
        });

        foreach (['trans_assets', 'trans_maintenances', 'trans_conditions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['trans_assets', 'trans_maintenances', 'trans_conditions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['reg_id']);
            });
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropPrimary(['reg_id']);
        });

        foreach (['trans_assets', 'trans_maintenances', 'trans_conditions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('reg_id', 10)->change();
            });
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->string('reg_id', 10)->change();
            $table->primary('reg_id');
        });

        foreach (['trans_assets', 'trans_maintenances', 'trans_conditions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreign('reg_id')->references('reg_id')->on('assets')->noActionOnDelete();
            });
        }
    }
};
