<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Estate;
use App\Models\Material;
use App\Models\Section;
use App\Models\Unit;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MaterialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $electronics = Category::where('category', 'Electronics')->first();
        $furniture = Category::where('category', 'Furniture')->first();
        $section = Section::first();
        $pcs = Unit::where('nama', 'PCS')->first();
        $estates = Estate::orderBy('id')->get();

        if (!$electronics || !$furniture || !$section || !$pcs || $estates->isEmpty()) {
            return;
        }

        // Drop old global seed rows so the data set stays deterministic on repeat seeding.
        Material::whereIn('code', ['MAT001', 'MAT002', 'MAT003', 'MAT004'])->delete();

        $templates = [
            ['sequence' => '001', 'category_id' => $electronics->id, 'nama' => 'Laptop Dell Latitude', 'stock' => 10],
            ['sequence' => '002', 'category_id' => $electronics->id, 'nama' => 'MacBook Pro M3', 'stock' => 5],
            ['sequence' => '003', 'category_id' => $furniture->id, 'nama' => 'Ergonomic Chair', 'stock' => 20],
            ['sequence' => '004', 'category_id' => $furniture->id, 'nama' => 'Office Desk', 'stock' => 15],
        ];

        foreach ($estates as $estate) {
            foreach ($templates as $template) {
                Material::updateOrCreate(
                    ['code' => sprintf('MAT-%s-%s', $estate->estate_id, $template['sequence'])],
                    [
                        'category_id' => $template['category_id'],
                        'section_id' => $section->id,
                        'unit_id' => $pcs->id,
                        'estate_id' => $estate->id,
                        'nama' => $template['nama'],
                        'stock' => $template['stock'],
                        'not_active' => false,
                        'create_by' => 'admin',
                    ]
                );
            }
        }
    }
}
