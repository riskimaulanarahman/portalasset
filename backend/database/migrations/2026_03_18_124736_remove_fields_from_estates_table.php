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
        Schema::table('estates', function (Blueprint $table) {
            $table->dropColumn(['estate_join', 'bu', 'region']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('estates', function (Blueprint $table) {
            $table->string('estate_join', 3)->after('estate');
            $table->string('bu', 3)->after('estate_join');
            $table->string('region', 15)->after('bu');
        });
    }
};
