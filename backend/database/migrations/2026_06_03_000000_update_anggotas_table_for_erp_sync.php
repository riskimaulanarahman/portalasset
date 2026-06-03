<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            // Expand columns that are too short for ERP data
            $table->string('nama', 100)->nullable()->change();
            $table->string('supervisor', 100)->nullable()->change();

            // New ERP-sourced fields
            $table->string('login_name', 50)->nullable()->after('sap_id');
            $table->string('company_code', 10)->nullable()->after('email');
            $table->string('cost_center', 100)->nullable()->after('company_code');
            $table->string('contract_status', 15)->nullable()->after('cost_center');
            $table->date('join_date')->nullable()->after('contract_status');
            $table->string('gender', 10)->nullable()->after('join_date');
        });
    }

    public function down(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            $table->dropColumn(['login_name', 'company_code', 'cost_center', 'contract_status', 'join_date', 'gender']);
            $table->string('nama', 25)->nullable()->change();
            $table->string('supervisor', 25)->nullable()->change();
        });
    }
};
