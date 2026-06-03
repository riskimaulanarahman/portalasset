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
        Schema::table('materials', function (Blueprint $table) {
            $table->foreignId('unit_id')->nullable()->after('category_id')->constrained('units')->nullOnDelete();
        });

        // Migrate existing data
        $materials = DB::table('materials')->get();
        foreach ($materials as $material) {
            if ($material->unit) {
                $unit = DB::table('units')->where('nama', $material->unit)->first();
                if (!$unit) {
                    $unitId = DB::table('units')->insertGetId([
                        'nama' => $material->unit,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $unitId = $unit->id;
                }
                DB::table('materials')->where('code', $material->code)->update(['unit_id' => $unitId]);
            }
        }

        Schema::table('materials', function (Blueprint $table) {
            $table->dropColumn('unit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->string('unit', 10)->nullable()->after('unit_id');
        });

        // Reverse migration: Populate unit string from units table
        $materials = DB::table('materials')->get();
        foreach ($materials as $material) {
            if ($material->unit_id) {
                $unit = DB::table('units')->find($material->unit_id);
                if ($unit) {
                    DB::table('materials')->where('code', $material->code)->update(['unit' => $unit->nama]);
                }
            }
        }

        Schema::table('materials', function (Blueprint $table) {
            $table->dropForeign(['unit_id']);
            $table->dropColumn('unit_id');
        });
    }
};
