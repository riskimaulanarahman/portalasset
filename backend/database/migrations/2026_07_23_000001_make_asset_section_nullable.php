<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('section_id')->nullable()->change();
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->foreign('section_id')->references('id')->on('sections')->noActionOnDelete();
        });
    }

    public function down(): void
    {
        $fallbackSectionId = DB::table('sections')->orderBy('id')->value('id');

        if ($fallbackSectionId) {
            DB::table('assets')
                ->whereNull('section_id')
                ->update(['section_id' => $fallbackSectionId]);
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('section_id')->nullable(false)->change();
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->foreign('section_id')->references('id')->on('sections')->noActionOnDelete();
        });
    }
};
