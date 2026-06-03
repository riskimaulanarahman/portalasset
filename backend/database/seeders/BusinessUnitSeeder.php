<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BusinessUnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $units = [
            ['bu_code' => 'IHM', 'bu_name' => 'Inti Harapan Mulia'],
            ['bu_code' => 'AHL', 'bu_name' => 'Adimitra Hutama Lestari'],
            ['bu_code' => 'NKL', 'bu_name' => 'Nusa Karya Lestari'],
        ];

        foreach ($units as $unit) {
            \App\Models\BusinessUnit::updateOrCreate(
                ['bu_code' => $unit['bu_code']],
                ['bu_name' => $unit['bu_name']]
            );
        }
    }
}
