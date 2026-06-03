<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class WorkflowSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $workflow = \App\Models\ApprovalWorkflow::updateOrCreate(
            ['module_name' => 'Transfer'],
            ['name' => 'Standard Transfer Workflow', 'is_active' => true]
        );

        \App\Models\ApprovalStep::updateOrCreate(
            ['workflow_id' => $workflow->id, 'sequence' => 1],
            ['role_name' => 'Manager', 'action_type' => 'Approver']
        );

        \App\Models\ApprovalStep::updateOrCreate(
            ['workflow_id' => $workflow->id, 'sequence' => 2],
            ['role_name' => 'Finance', 'action_type' => 'Approver']
        );
    }
}
