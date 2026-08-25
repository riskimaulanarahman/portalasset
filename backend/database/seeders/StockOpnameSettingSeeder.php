<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class StockOpnameSettingSeeder extends Seeder
{
    public function run(): void
    {
        Setting::set('stock_opname_qty_tolerance', 0, 'number', 'stock_opname');
        Setting::set('stock_opname_value_tolerance', 0, 'number', 'stock_opname');
        Setting::set('stock_opname_require_reason', true, 'boolean', 'stock_opname');
    }
}
