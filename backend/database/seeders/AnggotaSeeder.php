<?php

namespace Database\Seeders;

use App\Models\Estate;
use App\Models\Section;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AnggotaSeeder extends Seeder
{
    public function run(): void
    {
        $sections = Section::query()->get()->keyBy('section');
        $estates  = Estate::query()->get()->keyBy('estate_id');
        $now      = Carbon::now();

        $anggotas = [
            [
                'sap_id'    => 'MBR-TRN-001',
                'nik'       => 'TRN0001',
                'nama'      => 'Budi Anggota',
                'position'  => 'Staff Gudang',
                'supervisor'=> 'Manager TRN',
                'email'     => 'budi.anggota@portalasset.test',
                'section_id'=> $sections->get('OPS')?->id,
                'estate_id' => $estates->get('TRN')?->id,
            ],
            [
                'sap_id'    => 'MBR-TRN-002',
                'nik'       => 'TRN0002',
                'nama'      => 'Sinta Terunen',
                'position'  => 'Admin Estate',
                'supervisor'=> 'Manager TRN',
                'email'     => 'sinta.terunen@portalasset.test',
                'section_id'=> $sections->get('HRD')?->id,
                'estate_id' => $estates->get('TRN')?->id,
            ],
            [
                'sap_id'    => 'MBR-SPU-001',
                'nik'       => 'SPU0001',
                'nama'      => 'Rudi Sepaku',
                'position'  => 'Staff Operasi',
                'supervisor'=> 'Manager SPU',
                'email'     => 'rudi.sepaku@portalasset.test',
                'section_id'=> $sections->get('OPS')?->id,
                'estate_id' => $estates->get('SPU')?->id,
            ],
            [
                'sap_id'    => 'MBR-SNI-001',
                'nik'       => 'SNI0001',
                'nama'      => 'Dina Senoni',
                'position'  => 'Staff IT',
                'supervisor'=> 'Manager SNI',
                'email'     => 'dina.senoni@portalasset.test',
                'section_id'=> $sections->get('ITD')?->id,
                'estate_id' => $estates->get('SNI')?->id,
            ],
            [
                'sap_id'    => 'MBR-SBS-001',
                'nik'       => 'SBS0001',
                'nama'      => 'Rama Sebakis',
                'position'  => 'Storekeeper',
                'supervisor'=> 'Manager SBS',
                'email'     => 'rama.sebakis@portalasset.test',
                'section_id'=> $sections->get('PRC')?->id,
                'estate_id' => $estates->get('SBS')?->id,
            ],
            [
                'sap_id'    => 'MBR-SBG-001',
                'nik'       => 'SBG0001',
                'nama'      => 'Lina Sembakung',
                'position'  => 'Admin Finance',
                'supervisor'=> 'Finance SBG',
                'email'     => 'lina.sembakung@portalasset.test',
                'section_id'=> $sections->get('FIN')?->id,
                'estate_id' => $estates->get('SBG')?->id,
            ],
            [
                'sap_id'    => 'MBR-SSP-001',
                'nik'       => 'SSP0001',
                'nama'      => 'Farid Sesayap',
                'position'  => 'Staff Workshop',
                'supervisor'=> 'Manager SSP',
                'email'     => 'farid.sesayap@portalasset.test',
                'section_id'=> $sections->get('OPS')?->id,
                'estate_id' => $estates->get('SSP')?->id,
            ],
            [
                'sap_id'    => 'MBR-NKL-001',
                'nik'       => 'NKL0001',
                'nama'      => 'Nina NKL',
                'position'  => 'Purchasing',
                'supervisor'=> 'Manager NKL',
                'email'     => 'nina.nkl@portalasset.test',
                'section_id'=> $sections->get('PRC')?->id,
                'estate_id' => $estates->get('NKL')?->id,
            ],
            [
                'sap_id'    => 'MBR-HO-001',
                'nik'       => 'HO0001',
                'nama'      => 'Tono Head Office',
                'position'  => 'IT Support',
                'supervisor'=> 'Manager HO',
                'email'     => 'tono.ho@portalasset.test',
                'section_id'=> $sections->get('ITD')?->id,
                'estate_id' => $estates->get('HO')?->id,
            ],
            [
                'sap_id'    => 'MBR-HO-002',
                'nik'       => 'HO0002',
                'nama'      => 'Maya Finance HO',
                'position'  => 'Finance Staff',
                'supervisor'=> 'Finance HO',
                'email'     => 'maya.finance.ho@portalasset.test',
                'section_id'=> $sections->get('FIN')?->id,
                'estate_id' => $estates->get('HO')?->id,
            ],
        ];

        foreach ($anggotas as $anggota) {
            \App\Models\Anggota::updateOrCreate(
                ['sap_id' => $anggota['sap_id']],
                array_merge($anggota, [
                    'not_active'  => false,
                    'create_by'   => 'admin',
                    'create_date' => $now,
                    'update_by'   => 'admin',
                    'update_date' => $now,
                ])
            );
        }
    }
}
