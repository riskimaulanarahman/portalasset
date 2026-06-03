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
        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('estate_id')->nullable()->after('reg_id')->constrained('estates')->restrictOnDelete();
        });

        Schema::table('materials', function (Blueprint $table) {
            $table->foreignId('estate_id')->nullable()->after('code')->constrained('estates')->restrictOnDelete();
        });

        Schema::table('software', function (Blueprint $table) {
            $table->foreignId('estate_id')->nullable()->after('id')->constrained('estates')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['estate_id']);
            $table->dropColumn('estate_id');
        });

        Schema::table('materials', function (Blueprint $table) {
            $table->dropForeign(['estate_id']);
            $table->dropColumn('estate_id');
        });

        Schema::table('software', function (Blueprint $table) {
            $table->dropForeign(['estate_id']);
            $table->dropColumn('estate_id');
        });
    }
};
