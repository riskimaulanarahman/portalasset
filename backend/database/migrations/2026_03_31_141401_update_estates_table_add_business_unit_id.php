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
        Schema::table('estates', function (Blueprint $table) {
            if (!Schema::hasColumn('estates', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('estate_id')->constrained('business_units')->onDelete('cascade');
            }
            
            if (Schema::hasColumn('estates', 'bu')) {
                $table->dropColumn('bu');
            }

            if (!Schema::hasColumn('estates', 'estate_join')) {
                $table->string('estate_join', 10)->nullable()->after('estate');
            }

            if (!Schema::hasColumn('estates', 'region')) {
                $table->string('region', 30)->nullable()->after('business_unit_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('estates', function (Blueprint $table) {
            //
        });
    }
};
