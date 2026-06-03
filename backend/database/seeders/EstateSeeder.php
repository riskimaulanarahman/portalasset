<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EstateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $buIhm = \App\Models\BusinessUnit::where('bu_code', 'IHM')->first();
        $buAhl = \App\Models\BusinessUnit::where('bu_code', 'AHL')->first();
        $buNkl = \App\Models\BusinessUnit::where('bu_code', 'NKL')->first();

        $estates = [
            ['estate_id' => 'TRN', 'estate' => 'Terunen', 'estate_join' => 'TRN', 'business_unit_id' => $buIhm->id, 'region' => 'KALTIM'],
            ['estate_id' => 'SPU', 'estate' => 'Sepaku', 'estate_join' => 'SPU', 'business_unit_id' => $buIhm->id, 'region' => 'KALTIM'],
            ['estate_id' => 'SNI', 'estate' => 'Senoni', 'estate_join' => 'SNI', 'business_unit_id' => $buIhm->id, 'region' => 'KALTIM'],
            ['estate_id' => 'SBS', 'estate' => 'Sebakis', 'estate_join' => 'SBS', 'business_unit_id' => $buAhl->id, 'region' => 'KALTARA'],
            ['estate_id' => 'SBG', 'estate' => 'Sembakung', 'estate_join' => 'SBG', 'business_unit_id' => $buAhl->id, 'region' => 'KALTARA'],
            ['estate_id' => 'SSP', 'estate' => 'Sesayap', 'estate_join' => 'SSP', 'business_unit_id' => $buAhl->id, 'region' => 'KALTARA'],
            ['estate_id' => 'NKL', 'estate' => 'Nusa Karya Lestari', 'estate_join' => 'NKL', 'business_unit_id' => $buNkl->id, 'region' => 'KALTIM'],
            ['estate_id' => 'HO', 'estate' => 'Head Office', 'estate_join' => 'HO', 'business_unit_id' => $buIhm->id, 'region' => 'JAKARTA'],
        ];

        foreach ($estates as $estate) {
            \App\Models\Estate::updateOrCreate(
                ['estate_id' => $estate['estate_id']],
                $estate
            );
        }
    }
}
