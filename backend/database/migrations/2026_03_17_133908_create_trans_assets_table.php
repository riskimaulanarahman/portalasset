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
        Schema::create('trans_assets', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('reg_id', 10);
            $table->foreign('reg_id')->references('reg_id')->on('assets')->restrictOnDelete();
            $table->string('sap1', 15)->nullable()->comment('SAP ID pemegang sebelumnya');
            $table->string('nama1', 50)->nullable()->comment('Nama pemegang sebelumnya');
            $table->string('from_', 20)->nullable()->comment('Username/estate asal transfer');
            $table->string('sap2', 15)->nullable()->comment('SAP ID penerima');
            $table->string('nama2', 50)->nullable()->comment('Nama penerima');
            $table->string('section', 25)->nullable()->comment('HO atau Estate');
            $table->string('estate', 50)->nullable();
            $table->string('attachment', 50)->nullable();
            $table->text('keterangan')->nullable();
            $table->string('kondisi', 10)->nullable()->comment('Good/Bad/Broken');
            $table->enum('process', ['Available','Pending Approval','Need Approval','Need Approval2','Transfer','Write Off'])->nullable();
            $table->date('date_return')->nullable();
            $table->string('ep', 50)->nullable()->comment('Estate Planner approver');
            $table->dateTime('ep_date')->nullable();
            $table->string('rm', 50)->nullable()->comment('Regional Manager approver');
            $table->dateTime('rm_date')->nullable();
            $table->string('cost_center', 15)->nullable();
            $table->string('replace_asset', 10)->nullable();
            $table->string('create_by', 25);
            $table->dateTime('create_date')->nullable();
            $table->string('update_by', 25)->nullable();
            $table->dateTime('update_date')->nullable();
            $table->softDeletes();
            $table->index('reg_id');
            $table->index('process');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trans_assets');
    }
};
