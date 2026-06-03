<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CostCenterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $centers = [
            ['cost_center' => '10101', 'dept' => 'Corporate IT', 'estate' => 'HO', 'join_estate' => 'HO', 'created_by' => 'admin'],
            ['cost_center' => '10201', 'dept' => 'Accounting', 'estate' => 'HO', 'join_estate' => 'HO', 'created_by' => 'admin'],
            ['cost_center' => '20101', 'dept' => 'Operation', 'estate' => 'TRN', 'join_estate' => 'TRN', 'created_by' => 'admin'],
            ['cost_center' => '20201', 'dept' => 'Maintenance', 'estate' => 'TRN', 'join_estate' => 'TRN', 'created_by' => 'admin'],
        ];

        foreach ($centers as $center) {
            \App\Models\CostCenter::updateOrCreate(
                ['cost_center' => $center['cost_center']],
                $center
            );
        }
    }
}
