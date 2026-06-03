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
        if (!Schema::hasColumn('assets', 'vendor_id')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->foreignId('vendor_id')->nullable()->after('manufacture')->constrained('vendors')->nullOnDelete();
            });
        }

        // Migrate existing data
        $assets = DB::table('assets')->get();
        foreach ($assets as $asset) {
            if ($asset->vendor) {
                $vendor = DB::table('vendors')->where('nama', $asset->vendor)->first();
                if (!$vendor) {
                    $vendorId = DB::table('vendors')->insertGetId([
                        'nama' => $asset->vendor,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $vendorId = $vendor->id;
                }
                DB::table('assets')->where('reg_id', $asset->reg_id)->update(['vendor_id' => $vendorId]);
            }
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn('vendor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->text('vendor')->nullable()->after('vendor_id');
        });

        // Reverse migration: Populate vendor string from vendors table
        $assets = DB::table('assets')->get();
        foreach ($assets as $asset) {
            if ($asset->vendor_id) {
                $vendor = DB::table('vendors')->find($asset->vendor_id);
                if ($vendor) {
                    DB::table('assets')->where('id', $asset->id)->update(['vendor' => $vendor->nama]);
                }
            }
        }

        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->dropColumn('vendor_id');
        });
    }
};
