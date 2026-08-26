<?php

namespace Database\Seeders;

use App\Models\CostCenter;
use App\Models\Estate;
use Illuminate\Database\Seeder;

class CostCenterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $estates = Estate::query()->get()->keyBy('estate_id');

        $centers = [
            ['cost_center' => '10101', 'dept' => 'Corporate IT', 'estate' => 'HO', 'join_estate' => 'HO', 'created_by' => 'admin'],
            ['cost_center' => '10201', 'dept' => 'Accounting', 'estate' => 'HO', 'join_estate' => 'HO', 'created_by' => 'admin'],
            ['cost_center' => '20101', 'dept' => 'Operation', 'estate' => 'TRN', 'join_estate' => 'TRN', 'created_by' => 'admin'],
            ['cost_center' => '20201', 'dept' => 'Maintenance', 'estate' => 'TRN', 'join_estate' => 'TRN', 'created_by' => 'admin'],
        ];

        foreach ($centers as $center) {
            $center['estate_id'] = $estates->get($center['join_estate'] ?: $center['estate'])?->id;

            CostCenter::updateOrCreate(
                ['cost_center' => $center['cost_center']],
                $center
            );
        }
    }
}
