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
        Schema::table('software', function (Blueprint $table) {
            $table->string('name', 50)->after('id');
            $table->string('vendor', 50)->nullable()->after('name');
            $table->string('license_key', 50)->nullable()->after('vendor');
            $table->date('expiry_date')->nullable()->after('license_key');
            $table->string('status', 20)->default('Active')->after('expiry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('software', function (Blueprint $table) {
            $table->dropColumn(['name', 'vendor', 'license_key', 'expiry_date', 'status']);
        });
    }
};
