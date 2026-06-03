<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AssetTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            ['name' => 'Laptop'],
            ['name' => 'Desktop'],
            ['name' => 'Chair'],
            ['name' => 'Table'],
            ['name' => 'Vehicle'],
        ];

        foreach ($types as $type) {
            \App\Models\AssetType::updateOrCreate(
                ['name' => $type['name']]
            );
        }
    }
}
