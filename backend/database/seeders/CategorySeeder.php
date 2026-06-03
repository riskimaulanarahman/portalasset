<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $section = \App\Models\Section::first();

        $categories = [
            ['category' => 'Electronics', 'section_id' => $section->id],
            ['category' => 'Furniture', 'section_id' => $section->id],
            ['category' => 'Vehicles', 'section_id' => $section->id],
            ['category' => 'Tools & Equipments', 'section_id' => $section->id],
        ];

        foreach ($categories as $cat) {
            \App\Models\Category::updateOrCreate(
                ['category' => $cat['category']],
                ['section_id' => $cat['section_id']]
            );
        }
    }
}
