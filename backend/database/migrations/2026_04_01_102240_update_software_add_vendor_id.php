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
        if (!Schema::hasColumn('software', 'vendor_id')) {
            Schema::table('software', function (Blueprint $table) {
                $table->foreignId('vendor_id')->nullable()->after('name')->constrained('vendors')->nullOnDelete();
            });
        }

        // Migrate existing data
        $softwareItems = DB::table('software')->get();
        foreach ($softwareItems as $item) {
            if ($item->vendor) {
                $vendor = DB::table('vendors')->where('nama', $item->vendor)->first();
                if (!$vendor) {
                    $vendorId = DB::table('vendors')->insertGetId([
                        'nama' => $item->vendor,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $vendorId = $vendor->id;
                }
                DB::table('software')->where('id', $item->id)->update(['vendor_id' => $vendorId]);
            }
        }

        Schema::table('software', function (Blueprint $table) {
            $table->dropColumn('vendor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('software', function (Blueprint $table) {
            $table->string('vendor', 50)->nullable()->after('vendor_id');
        });

        // Reverse migration: Populate vendor string from vendors table
        $softwareItems = DB::table('software')->get();
        foreach ($softwareItems as $item) {
            if ($item->vendor_id) {
                $vendor = DB::table('vendors')->find($item->vendor_id);
                if ($vendor) {
                    DB::table('software')->where('id', $item->id)->update(['vendor' => $vendor->nama]);
                }
            }
        }

        Schema::table('software', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
            $table->dropColumn('vendor_id');
        });
    }
};
