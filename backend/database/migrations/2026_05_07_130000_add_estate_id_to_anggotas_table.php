<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            $table->unsignedBigInteger('estate_id')->nullable()->after('section_id');
            $table->foreign('estate_id')->references('id')->on('estates')->nullOnDelete();
        });

        $hoId = DB::table('estates')->where('estate_id', 'HO')->value('id');
        if ($hoId) {
            DB::table('anggotas')->whereNull('estate_id')->update(['estate_id' => $hoId]);
        }
    }

    public function down(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            $table->dropForeign(['estate_id']);
            $table->dropColumn('estate_id');
        });
    }
};
