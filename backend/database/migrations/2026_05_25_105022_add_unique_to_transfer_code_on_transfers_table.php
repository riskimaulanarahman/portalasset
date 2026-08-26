<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// #4 FIX: Pastikan transfer_code memiliki UNIQUE constraint di database
// untuk mencegah duplikat race condition saat concurrency tinggi
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasIndex('transfers', 'transfers_transfer_code_unique')) {
            Schema::table('transfers', function (Blueprint $table) {
                $table->unique('transfer_code', 'transfers_transfer_code_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            $table->dropUnique('transfers_transfer_code_unique');
        });
    }
};
