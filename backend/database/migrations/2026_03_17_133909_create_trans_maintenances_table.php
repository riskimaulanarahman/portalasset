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
        Schema::create('trans_maintenances', function (Blueprint $table) {
            $table->id();
            $table->string('reg_id', 10);
            $table->foreign('reg_id')->references('reg_id')->on('assets')->restrictOnDelete();
            $table->date('terima')->nullable()->comment('Tanggal diterima maintenance');
            $table->date('target')->nullable();
            $table->date('selesai')->nullable()->comment('Tanggal selesai maintenance');
            $table->string('sap1', 15)->nullable();
            $table->string('nama1', 50)->nullable()->comment('Nama penerima di maintenance');
            $table->string('sap2', 15)->nullable();
            $table->string('nama2', 50)->nullable()->comment('Nama pengirim/pengaju maintenance');
            $table->string('sent_', 15)->nullable()->comment('Tujuan maintenance: GIS, PH, dll');
            $table->string('kondisi', 25);
            $table->text('keterangan')->nullable();
            $table->text('action_remark')->nullable()->comment('Catatan tindakan maintenance');
            $table->string('attachment', 50)->nullable();
            $table->enum('status', ['Progress','Done'])->nullable();
            $table->string('sap3', 15)->nullable();
            $table->string('nama3', 50)->nullable()->comment('Nama yang konfirmasi selesai');
            $table->boolean('validasi')->default(false)->comment('1=HO/RAP validasi, 0=perlu approval HO');
            $table->string('create_by', 25);
            $table->dateTime('create_date');
            $table->string('update_by', 25)->nullable();
            $table->dateTime('update_date')->nullable();
            $table->softDeletes();
            $table->index(['reg_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trans_maintenances');
    }
};
