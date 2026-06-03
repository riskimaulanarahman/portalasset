<?php

namespace Database\Seeders;

use App\Models\Vendor;
use Illuminate\Database\Seeder;

class VendorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vendors = [
            [
                'nama' => 'Bhinneka Mandiri',
                'alamat' => 'Jl. Gunung Sahari No. 73, Jakarta Pusat',
                'telepon' => '021-29292828',
                'email' => 'sales@bhinneka.com',
                'pic' => 'Budi Santoso'
            ],
            [
                'nama' => 'Gading Computer',
                'alamat' => 'Mall Kelapa Gading Lantai 2, Jakarta Utara',
                'telepon' => '021-45853939',
                'email' => 'info@gadingcomputer.com',
                'pic' => 'Siska Wijaya'
            ],
            [
                'nama' => 'Mitra Solusi IT',
                'alamat' => 'Sudirman Central Business District, Jakarta Selatan',
                'telepon' => '021-5151000',
                'email' => 'support@msit.co.id',
                'pic' => 'Andi Wijaya'
            ],
        ];

        foreach ($vendors as $vendor) {
            Vendor::updateOrCreate(['nama' => $vendor['nama']], $vendor);
        }
    }
}
