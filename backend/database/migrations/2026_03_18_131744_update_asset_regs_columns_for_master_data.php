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
        Schema::table('asset_regs', function (Blueprint $table) {
            $table->foreignId('manufacturer_id')->after('id')->nullable()->constrained('manufacturers')->nullOnDelete();
            $table->foreignId('asset_type_id')->after('manufacturer_id')->nullable()->constrained('asset_types')->nullOnDelete();
        });

        // Migrate existing data
        $assetRegs = DB::table('asset_regs')->get();
        foreach ($assetRegs as $reg) {
            $manufacturerId = null;
            $assetTypeId = null;

            if ($reg->manufacture) {
                $manufacturerId = DB::table('manufacturers')->updateOrInsert(
                    ['name' => $reg->manufacture],
                    ['create_date' => now()]
                );
                $manufacturerId = DB::table('manufacturers')->where('name', $reg->manufacture)->value('id');
            }

            if ($reg->type) {
                $assetTypeId = DB::table('asset_types')->updateOrInsert(
                    ['name' => $reg->type],
                    ['create_date' => now()]
                );
                $assetTypeId = DB::table('asset_types')->where('name', $reg->type)->value('id');
            }

            DB::table('asset_regs')->where('id', $reg->id)->update([
                'manufacturer_id' => $manufacturerId,
                'asset_type_id' => $assetTypeId,
            ]);
        }

        Schema::table('asset_regs', function (Blueprint $table) {
            $table->dropColumn(['manufacture', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asset_regs', function (Blueprint $table) {
            $table->string('manufacture', 50)->nullable();
            $table->string('type', 50)->nullable();
        });

        // Optional: Migrate data back
        $assetRegs = DB::table('asset_regs')->get();
        foreach ($assetRegs as $reg) {
            $manufacture = DB::table('manufacturers')->where('id', $reg->manufacturer_id)->value('name');
            $type = DB::table('asset_types')->where('id', $reg->asset_type_id)->value('name');

            DB::table('asset_regs')->where('id', $reg->id)->update([
                'manufacture' => $manufacture,
                'type' => $type,
            ]);
        }

        Schema::table('asset_regs', function (Blueprint $table) {
            $table->dropForeign(['manufacturer_id']);
            $table->dropForeign(['asset_type_id']);
            $table->dropColumn(['manufacturer_id', 'asset_type_id']);
        });
    }
};
