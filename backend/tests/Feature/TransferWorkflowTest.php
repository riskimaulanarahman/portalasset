<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Asset;
use App\Models\AssetDepartment;
use App\Models\AssetDivision;
use App\Models\Category;
use App\Models\Estate;
use App\Models\Material;
use App\Models\Section;
use App\Models\Transfer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TransferWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Estate $sourceEstate;
    private Estate $destinationEstate;
    private AssetDepartment $department;
    private AssetDivision $division;
    private Section $section;
    private Asset $asset;
    private User $sourceUser;
    private User $destinationUser;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view-transfers',
            'create-transfers',
            'edit-transfers',
            'delete-transfers',
            'cancel-transfers',
            'view-assets',
        ] as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $estateRole = Role::findOrCreate('estate', 'web');

        $this->sourceEstate = Estate::create(['estate_id' => 'SRC', 'estate' => 'Source Estate']);
        $this->destinationEstate = Estate::create(['estate_id' => 'DST', 'estate' => 'Destination Estate']);
        $this->section = Section::create(['section' => 'IT', 'section_full' => 'Information Technology']);
        $this->department = AssetDepartment::create(['name' => 'Ops']);
        $this->division = AssetDivision::create([
            'asset_department_id' => $this->department->id,
            'name' => 'Field',
        ]);

        $this->sourceUser = User::factory()->create([
            'estate_id' => $this->sourceEstate->id,
            'role_id' => $estateRole->id,
            'not_active' => false,
            'guid' => 'test-source-user',
            'domain' => 'local',
        ]);
        $this->sourceUser->assignRole($estateRole);
        $this->sourceUser->givePermissionTo([
            'view-transfers',
            'create-transfers',
            'edit-transfers',
            'delete-transfers',
            'cancel-transfers',
            'view-assets',
        ]);
        $this->sourceUser->assetDepartments()->sync([$this->department->id]);
        $this->sourceUser->assetDivisions()->sync([$this->division->id]);

        $this->destinationUser = User::factory()->create([
            'estate_id' => $this->destinationEstate->id,
            'role_id' => $estateRole->id,
            'not_active' => false,
            'guid' => 'test-destination-user',
            'domain' => 'local',
        ]);
        $this->destinationUser->assignRole($estateRole);
        $this->destinationUser->givePermissionTo([
            'view-transfers',
            'cancel-transfers',
            'view-assets',
        ]);

        $this->asset = Asset::create([
            'reg_id' => 'AST-SRC-001',
            'asset_no' => 'ASSET-001',
            'serial_no' => 'SN-001',
            'type' => 'Laptop',
            'manufacture' => 'Dell',
            'series' => 'Latitude',
            'section_id' => $this->section->id,
            'estate_id' => $this->sourceEstate->id,
            'unit_id' => 'SRC',
            'asset_department_id' => $this->department->id,
            'asset_division_id' => $this->division->id,
        ]);
    }

    public function test_submit_without_workflow_is_rejected(): void
    {
        $this->actingAs($this->sourceUser, 'sanctum')
            ->postJson('/api/transfers', $this->transferPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workflow']);

        $this->assertDatabaseMissing('transfers', [
            'type' => 'Asset',
            'from_estate_id' => (string) $this->sourceEstate->id,
        ]);
    }

    public function test_workflow_without_active_approver_is_rejected(): void
    {
        ApprovalWorkflow::create([
            'name' => 'Transfer DST',
            'module_name' => 'Transfer',
            'estate_id' => $this->destinationEstate->id,
            'is_active' => true,
        ])->steps()->create([
            'sequence' => 1,
            'role_name' => 'manager',
            'action_type' => 'Approver',
        ]);

        $this->actingAs($this->sourceUser, 'sanctum')
            ->postJson('/api/transfers', $this->transferPayload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workflow']);
    }

    public function test_asset_transfer_accepts_items_without_qty_and_defaults_to_one(): void
    {
        $this->createDestinationTransferWorkflow();

        $response = $this->actingAs($this->sourceUser, 'sanctum')
            ->postJson('/api/transfers', $this->transferPayload(includeQty: false))
            ->assertCreated();

        $this->assertDatabaseHas('transfer_items', [
            'transfer_id' => $response->json('data.id'),
            'item_type' => 'Asset',
            'item_id' => $this->asset->reg_id,
            'qty' => 1,
        ]);
    }

    public function test_material_transfer_still_requires_qty(): void
    {
        $category = Category::create([
            'category' => 'Consumable',
            'section_id' => $this->section->id,
        ]);

        $material = Material::create([
            'code' => 'MAT-SRC-001',
            'nama' => 'Test Material',
            'category_id' => $category->id,
            'section_id' => $this->section->id,
            'estate_id' => $this->sourceEstate->id,
            'stock' => 5,
        ]);

        $this->actingAs($this->sourceUser, 'sanctum')
            ->postJson('/api/transfers', [
                'type' => 'Material',
                'to_estate_id' => $this->destinationEstate->id,
                'items' => [
                    ['item_id' => $material->code],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.qty']);
    }

    public function test_source_user_cannot_approve_destination_request(): void
    {
        $transfer = $this->createPendingTransfer();
        $approval = ApprovalRequest::where('reference_table', 'transfers')
            ->where('reference_id', $transfer->id)
            ->firstOrFail();

        $this->actingAs($this->sourceUser, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'source tries approve'])
            ->assertForbidden();
    }

    public function test_destination_user_cannot_cancel_source_transfer(): void
    {
        $transfer = $this->createPendingTransfer();

        $this->actingAs($this->destinationUser, 'sanctum')
            ->postJson("/api/transfers/{$transfer->id}/cancel")
            ->assertForbidden();
    }

    public function test_status_cannot_be_changed_from_general_update_endpoint(): void
    {
        $transfer = $this->createPendingTransfer();

        $this->actingAs($this->sourceUser, 'sanctum')
            ->putJson("/api/transfers/{$transfer->id}", ['status' => 'Approved'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('transfers', [
            'id' => $transfer->id,
            'status' => 'Pending Approval',
        ]);
    }

    private function createPendingTransfer(): Transfer
    {
        $this->createDestinationTransferWorkflow();

        $this->actingAs($this->sourceUser, 'sanctum')
            ->postJson('/api/transfers', $this->transferPayload())
            ->assertCreated();

        return Transfer::latest('id')->firstOrFail();
    }

    private function createDestinationTransferWorkflow(): void
    {
        ApprovalWorkflow::create([
            'name' => 'Transfer DST',
            'module_name' => 'Transfer',
            'estate_id' => $this->destinationEstate->id,
            'is_active' => true,
        ])->steps()->create([
            'sequence' => 1,
            'role_name' => 'estate',
            'action_type' => 'Approver',
        ]);
    }

    private function transferPayload(bool $includeQty = true): array
    {
        $item = [
            'item_id' => $this->asset->reg_id,
        ];

        if ($includeQty) {
            $item['qty'] = 1;
        }

        return [
            'type' => 'Asset',
            'to_estate_id' => $this->destinationEstate->id,
            'items' => [$item],
        ];
    }
}
