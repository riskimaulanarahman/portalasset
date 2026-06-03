<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SoftwareSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ms = \App\Models\Vendor::where('nama', 'Microsoft')->first()?->id;
        $adobe = \App\Models\Vendor::where('nama', 'Adobe')->first()?->id;
        $sap = \App\Models\Vendor::where('nama', 'SAP')->first()?->id;

        $software = [
            ['name' => 'Windows 11 Pro', 'vendor_id' => $ms, 'license_key' => 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', 'expiry_date' => '2030-12-31', 'status' => 'Active'],
            ['name' => 'Office 365', 'vendor_id' => $ms, 'license_key' => 'SUBS-OFFICE-365', 'expiry_date' => '2025-06-30', 'status' => 'Active'],
            ['name' => 'Adobe CC', 'vendor_id' => $adobe, 'license_key' => 'ADOBE-CC-LICENSE', 'expiry_date' => '2025-01-15', 'status' => 'Active'],
            ['name' => 'SAP S/4HANA', 'vendor_id' => $sap, 'license_key' => 'SAP-ENTERPRISE-KEY', 'expiry_date' => '2028-12-31', 'status' => 'Active'],
        ];

        foreach ($software as $sw) {
            \App\Models\Software::updateOrCreate(
                ['name' => $sw['name']],
                $sw
            );
        }
    }
}
