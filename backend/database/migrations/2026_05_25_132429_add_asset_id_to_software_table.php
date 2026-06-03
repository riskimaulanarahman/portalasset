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
        // #19 FIX: Tambahkan kolom asset_id pada tabel software
        // agar software dapat dikaitkan ke asset fisik yang menjadi hostnya.
        Schema::table('software', function (Blueprint $table) {
            $table->string('asset_id')->nullable()->after('estate_id');

            // Tidak pakai FK constraint karena asset PK adalah string (reg_id)
            // dan bisa null (software bisa standalone tanpa host asset)
            $table->index('asset_id');
        });
    }

    public function down(): void
    {
        Schema::table('software', function (Blueprint $table) {
            $table->dropIndex(['asset_id']);
            $table->dropColumn('asset_id');
        });
    }
};
