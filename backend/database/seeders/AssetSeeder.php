<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AssetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sections = \App\Models\Section::all();
        $types = \App\Models\AssetType::all();
        $manufacturers = \App\Models\Manufacturer::all();
        $estates = \App\Models\Estate::all();

        if ($sections->isEmpty() || $types->isEmpty() || $manufacturers->isEmpty() || $estates->isEmpty()) {
            return;
        }

        // Create Asset Registrations
        $reg1 = \App\Models\AssetReg::updateOrCreate(
            ['matcode' => 'MAT-LP-001'],
            [
                'asset_type_id' => $types->where('name', 'Laptop')->first()->id,
                'manufacturer_id' => $manufacturers->where('name', 'Dell')->first()->id,
                'series' => 'Latitude 5420',
                'description' => 'Business Laptop 14 inch',
                'section_id' => $sections->where('section', 'ITD')->first()->id,
                'not_active' => false,
                'create_by' => 'admin',
            ]
        );

        $reg2 = \App\Models\AssetReg::updateOrCreate(
            ['matcode' => 'MAT-DS-001'],
            [
                'asset_type_id' => $types->where('name', 'Desktop')->first()->id,
                'manufacturer_id' => $manufacturers->where('name', 'Apple')->first()->id,
                'series' => 'iMac M3',
                'description' => 'All-in-one Desktop',
                'section_id' => $sections->where('section', 'ITD')->first()->id,
                'not_active' => false,
                'create_by' => 'admin',
            ]
        );

        // Create Assets
        $i = 1;
        foreach ($estates as $estate) {
            // Add 2 assets per estate
            \App\Models\Asset::updateOrCreate(
                ['reg_id' => 'AST-' . $estate->estate_id . '-001'],
                [
                    'asset_no' => 'ASSET/' . $estate->estate_id . '/2024/' . str_pad($i++, 3, '0', STR_PAD_LEFT),
                    'unit_id' => $estate->estate_id,
                    'estate_id' => $estate->id,
                    'date' => now(),
                    'serial_no' => 'SN-' . strtoupper(bin2hex(random_bytes(4))),
                    'type_id' => $reg1->id,
                    'type' => 'Laptop',
                    'manufacture' => 'Dell',
                    'series' => 'Latitude 5420',
                    'section_id' => $sections->where('section', 'ITD')->first()->id,
                    'alokasi' => 'STAFF',
                    'keterangan' => 'Condition: New',
                    'vendor_id' => \App\Models\Vendor::where('nama', 'Global IT Tech')->first()?->id,
                    'create_by' => 'admin',
                    'source' => 'PO-' . date('Ymd'),
                ]
            );

            \App\Models\Asset::updateOrCreate(
                ['reg_id' => 'AST-' . $estate->estate_id . '-002'],
                [
                    'asset_no' => 'ASSET/' . $estate->estate_id . '/2024/' . str_pad($i++, 3, '0', STR_PAD_LEFT),
                    'unit_id' => $estate->estate_id,
                    'estate_id' => $estate->id,
                    'date' => now(),
                    'serial_no' => 'SN-' . strtoupper(bin2hex(random_bytes(4))),
                    'type_id' => $reg2->id,
                    'type' => 'Desktop',
                    'manufacture' => 'Apple',
                    'series' => 'iMac M3',
                    'section_id' => $sections->where('section', 'ITD')->first()->id,
                    'alokasi' => 'MANAGER',
                    'keterangan' => 'Condition: Excellent',
                    'vendor_id' => \App\Models\Vendor::where('nama', 'Premium Reseller')->first()?->id,
                    'create_by' => 'admin',
                    'source' => 'PO-' . date('Ymd'),
                ]
            );
        }
    }
}
