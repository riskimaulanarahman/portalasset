<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('anggota_id', 15)->nullable()->after('asset_division_id');
            $table->index('anggota_id', 'assets_anggota_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropIndex('assets_anggota_id_idx');
            $table->dropColumn('anggota_id');
        });
    }
};
