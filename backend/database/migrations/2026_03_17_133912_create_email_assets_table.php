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
        Schema::create('email_assets', function (Blueprint $table) {
            $table->id();
            $table->string('sector', 10)->unique()->comment('estate_id atau username');
            $table->text('ep')->nullable()->comment('Estate Planner email');
            $table->text('em')->nullable()->comment('Estate Manager email');
            $table->text('rm')->nullable()->comment('Regional Manager email');
            $table->text('opm')->nullable()->comment('Operation Manager email');
            $table->text('admin')->nullable()->comment('Admin HO email');
            $table->text('ast')->nullable()->comment('Asset admin email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_assets');
    }
};
