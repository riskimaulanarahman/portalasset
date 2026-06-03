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
        Schema::table('approval_workflows', function (Blueprint $table) {
            $table->foreignId('estate_id')->nullable()->after('module_name')->constrained('estates')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('approval_workflows', function (Blueprint $table) {
            $table->dropForeign(['estate_id']);
            $table->dropColumn('estate_id');
        });
    }
};
