<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ManufacturerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $manufacturers = [
            ['name' => 'Dell'],
            ['name' => 'Apple'],
            ['name' => 'Lenovo'],
            ['name' => 'IKEA'],
            ['name' => 'Toyota'],
        ];

        foreach ($manufacturers as $man) {
            \App\Models\Manufacturer::updateOrCreate(
                ['name' => $man['name']]
            );
        }
    }
}
