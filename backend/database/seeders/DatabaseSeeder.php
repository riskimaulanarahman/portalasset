<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            BusinessUnitSeeder::class,
            EstateSeeder::class,
            SectionSeeder::class,
            AnggotaSeeder::class,
            UnitSeeder::class,
            VendorSeeder::class,
            CategorySeeder::class,
            MaterialSeeder::class,
            AssetTypeSeeder::class,
            ManufacturerSeeder::class,
            AssetSeeder::class,
            WorkflowSeeder::class,
            SoftwareSeeder::class,
            CostCenterSeeder::class,
            UserSeeder::class,
            TransferSeeder::class,
        ]);
    }
}
