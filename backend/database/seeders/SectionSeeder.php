<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sections = [
            ['section' => 'ITD', 'section_full' => 'IT Department'],
            ['section' => 'HRD', 'section_full' => 'Human Resources'],
            ['section' => 'FIN', 'section_full' => 'Finance & Accounting'],
            ['section' => 'OPS', 'section_full' => 'Operation'],
            ['section' => 'MKT', 'section_full' => 'Marketing'],
            ['section' => 'PRC', 'section_full' => 'Procurement'],
        ];

        foreach ($sections as $sec) {
            \App\Models\Section::updateOrCreate(
                ['section' => $sec['section']],
                ['section_full' => $sec['section_full']]
            );
        }
    }
}
