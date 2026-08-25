<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Asset;
use App\Models\AssetDepartment;
use App\Models\AssetDivision;
use App\Models\Estate;
use App\Models\Section;
use App\Models\TransAsset;
use App\Models\TransCondition;
use App\Models\TransMaintenance;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AssetDamageWriteOffWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Estate $estate;
    private Section $section;
    private AssetDepartment $department;
    private AssetDivision $division;
    private User $estateUser;
    private User $approver;
    private Asset $asset;
    private Role $estateRole;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view-assets',
            'create-asset-reports',
            'create-write-offs',
            'view-write-offs',
            'cancel-write-offs',
            'download-write-off-ba',
        ] as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $this->estateRole = Role::findOrCreate('estate', 'web');

        $this->estate = Estate::create([
            'estate_id' => 'DME',
            'estate' => 'Damage Estate',
            'estate_join' => 'DME',
            'bu' => 'UAT',
            'region' => 'UAT',
        ]);

        $this->section = Section::create(['section' => 'IT', 'section_full' => 'Information Technology']);
        $this->department = AssetDepartment::create(['name' => 'IT']);
        $this->division = AssetDivision::create([
            'asset_department_id' => $this->department->id,
            'name' => 'Support',
        ]);

        $this->estateUser = $this->makeUser('estate-user');
        $this->approver = $this->makeUser('approver-user');

        $this->asset = Asset::create([
            'reg_id' => 'AST-DME-001',
            'asset_no' => 'ASSET-DME-001',
            'serial_no' => 'SN-DME-001',
            'type' => 'Laptop',
            'manufacture' => 'Dell',
            'series' => 'Latitude',
            'section_id' => $this->section->id,
            'estate_id' => $this->estate->id,
            'asset_department_id' => $this->department->id,
            'asset_division_id' => $this->division->id,
        ]);
    }

    public function test_estate_can_report_damage_and_create_maintenance(): void
    {
        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson("/api/assets/{$this->asset->reg_id}/report-damage", [
                'date' => now()->toDateString(),
                'kondisi' => 'Bad',
                'remarks' => 'Keyboard rusak dan perlu perbaikan segera.',
                'create_maintenance' => true,
                'terima' => now()->toDateString(),
                'target' => now()->addDay()->toDateString(),
                'sap1' => 'SAP001',
                'nama1' => 'PIC Estate',
                'sent_' => 'Internal',
                'keterangan' => 'Perbaikan keyboard',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('trans_conditions', [
            'reg_id' => $this->asset->reg_id,
            'kondisi' => 'Bad',
        ]);
        $this->assertDatabaseHas('trans_maintenances', [
            'reg_id' => $this->asset->reg_id,
            'status' => 'Progress',
        ]);
    }

    public function test_write_off_without_workflow_is_rejected(): void
    {
        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workflow']);

        $this->assertDatabaseMissing('trans_assets', [
            'reg_id' => $this->asset->reg_id,
            'process' => 'Write Off',
        ]);
        $this->assertFalse((bool) $this->asset->fresh()->not_active);
    }

    public function test_write_off_workflow_without_active_approver_is_rejected(): void
    {
        ApprovalWorkflow::create([
            'name' => 'Write Off DME',
            'module_name' => 'write-off',
            'estate_id' => $this->estate->id,
            'is_active' => true,
        ])->steps()->create([
            'sequence' => 1,
            'role_name' => 'manager',
            'action_type' => 'Approver',
        ]);

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workflow']);
    }

    public function test_pending_write_off_cannot_be_duplicated(): void
    {
        $this->createWriteOffWorkflow();

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertCreated();

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertUnprocessable();
    }

    public function test_final_approval_makes_asset_inactive(): void
    {
        $this->createWriteOffWorkflow();

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertCreated();

        $writeOff = TransAsset::writeOff()->where('reg_id', $this->asset->reg_id)->firstOrFail();
        $approval = ApprovalRequest::where('reference_table', 'trans_assets')
            ->where('reference_id', $writeOff->id)
            ->firstOrFail();

        $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'approved'])
            ->assertOk();

        $this->assertTrue((bool) $this->asset->fresh()->not_active);
    }

    public function test_approved_write_off_can_generate_berita_acara_pdf(): void
    {
        $this->createWriteOffWorkflow();

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertCreated();

        $writeOff = TransAsset::writeOff()->where('reg_id', $this->asset->reg_id)->firstOrFail();
        $approval = ApprovalRequest::where('reference_table', 'trans_assets')
            ->where('reference_id', $writeOff->id)
            ->firstOrFail();

        $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'approved'])
            ->assertOk();

        $this->actingAs($this->estateUser, 'sanctum')
            ->get("/api/write-offs/{$writeOff->id}/berita-acara")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_rejected_write_off_does_not_make_asset_inactive(): void
    {
        $this->createWriteOffWorkflow();

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertCreated();

        $writeOff = TransAsset::writeOff()->where('reg_id', $this->asset->reg_id)->firstOrFail();
        $approval = ApprovalRequest::where('reference_table', 'trans_assets')
            ->where('reference_id', $writeOff->id)
            ->firstOrFail();

        $this->actingAs($this->approver, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/reject", ['comment' => 'not valid'])
            ->assertOk();

        $this->assertFalse((bool) $this->asset->fresh()->not_active);
    }

    public function test_admin_role_write_off_workflow_can_approve_estate_asset(): void
    {
        $adminRole = Role::findOrCreate('admin', 'web');
        $hoEstate = Estate::create([
            'estate_id' => 'HO',
            'estate' => 'Head Office',
            'estate_join' => 'HO',
            'bu' => 'UAT',
            'region' => 'UAT',
        ]);
        $admin = User::factory()->create([
            'username' => 'ho-admin',
            'estate_id' => $hoEstate->id,
            'role_id' => $adminRole->id,
            'not_active' => false,
        ]);
        $admin->syncRoles([$adminRole]);

        ApprovalWorkflow::create([
            'name' => 'Write Off DME Admin',
            'module_name' => 'write-off',
            'estate_id' => $this->estate->id,
            'is_active' => true,
        ])->steps()->create([
            'sequence' => 1,
            'role_name' => 'admin',
            'action_type' => 'Approver',
        ]);

        $this->actingAs($this->estateUser, 'sanctum')
            ->postJson('/api/write-offs', $this->writeOffPayload())
            ->assertCreated();

        $writeOff = TransAsset::writeOff()->where('reg_id', $this->asset->reg_id)->firstOrFail();
        $approval = ApprovalRequest::where('reference_table', 'trans_assets')
            ->where('reference_id', $writeOff->id)
            ->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'approved by HO'])
            ->assertOk();

        $this->assertTrue((bool) $this->asset->fresh()->not_active);
    }

    private function makeUser(string $username): User
    {
        $user = User::factory()->create([
            'username' => $username,
            'estate_id' => $this->estate->id,
            'role_id' => $this->estateRole->id,
            'not_active' => false,
        ]);
        $user->syncRoles([$this->estateRole]);
        $user->givePermissionTo([
            'view-assets',
            'create-asset-reports',
            'create-write-offs',
            'view-write-offs',
            'cancel-write-offs',
            'download-write-off-ba',
        ]);
        $user->assetDepartments()->sync([$this->department->id]);
        $user->assetDivisions()->sync([$this->division->id]);

        return $user;
    }

    private function createWriteOffWorkflow(): ApprovalWorkflow
    {
        return tap(ApprovalWorkflow::create([
            'name' => 'Write Off DME',
            'module_name' => 'write-off',
            'estate_id' => $this->estate->id,
            'is_active' => true,
        ]), function (ApprovalWorkflow $workflow) {
            $workflow->steps()->create([
                'sequence' => 1,
                'role_name' => 'estate',
                'action_type' => 'Approver',
            ]);
        });
    }

    private function writeOffPayload(): array
    {
        return [
            'reg_id' => $this->asset->reg_id,
            'kondisi' => 'Broken',
            'keterangan' => 'Asset rusak berat dan tidak ekonomis untuk diperbaiki.',
        ];
    }
}
