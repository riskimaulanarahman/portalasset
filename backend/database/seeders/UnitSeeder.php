<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $units = [
            ['nama' => 'PCS', 'keterangan' => 'Pieces'],
            ['nama' => 'BOX', 'keterangan' => 'Box / Kotak'],
            ['nama' => 'SET', 'keterangan' => 'Set'],
            ['nama' => 'Meter', 'keterangan' => 'Satuan panjang'],
            ['nama' => 'Liter', 'keterangan' => 'Satuan volume'],
            ['nama' => 'Kg', 'keterangan' => 'Satuan berat'],
            ['nama' => 'Roll', 'keterangan' => 'Satuan gulungan'],
            ['nama' => 'Can', 'keterangan' => 'Kaleng'],
            ['nama' => 'Bottle', 'keterangan' => 'Botol'],
        ];

        foreach ($units as $unit) {
            Unit::updateOrCreate(['nama' => $unit['nama']], $unit);
        }
    }
}
