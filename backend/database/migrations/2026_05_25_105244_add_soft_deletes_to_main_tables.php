<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// #7 FIX: Tambah kolom deleted_at untuk soft delete pada tabel-tabel utama
// Ini mencegah data historis hilang permanen saat delete dilakukan dari UI
return new class extends Migration
{
    public function up(): void
    {
        // Assets — PK string (reg_id)
        Schema::table('assets', function (Blueprint $table) {
            $table->softDeletes(); // Tambah kolom deleted_at nullable
        });

        // Materials — PK string (code)
        Schema::table('materials', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Transfers
        Schema::table('transfers', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Transactions — tidak ada timestamps standar, gunakan softDeletesTz
        Schema::table('transactions', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Users
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('assets',       fn($t) => $t->dropSoftDeletes());
        Schema::table('materials',    fn($t) => $t->dropSoftDeletes());
        Schema::table('transfers',    fn($t) => $t->dropSoftDeletes());
        Schema::table('transactions', fn($t) => $t->dropSoftDeletes());
        Schema::table('users',        fn($t) => $t->dropSoftDeletes());
    }
};
