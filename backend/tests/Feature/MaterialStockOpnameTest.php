<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Estate;
use App\Models\Material;
use App\Models\MaterialStockOpname;
use App\Models\MaterialStockOpnameItem;
use App\Models\Section;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use App\Services\MaterialStockOpnameService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MaterialStockOpnameTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Estate $estate;
    private Section $section;
    private Category $category;
    private Unit $unit;
    private Role $estateRole;
    private Role $managerRole;
    private Role $financeRole;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view-material-stock-opnames',
            'create-material-stock-opnames',
            'edit-material-stock-opnames',
            'count-material-stock-opnames',
            'review-material-stock-opnames',
            'cancel-material-stock-opnames',
            'export-material-stock-opnames',
            'post-material-stock-opnames',
            'edit-materials',
            'view-materials',
        ] as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $this->estateRole = Role::findOrCreate('estate', 'web');
        $this->managerRole = Role::findOrCreate('manager', 'web');
        $this->financeRole = Role::findOrCreate('finance', 'web');

        $this->estate = Estate::create([
            'estate_id' => 'KLT',
            'estate' => 'Kalimantan',
        ]);

        $this->section = Section::create([
            'section' => 'STORE',
            'section_full' => 'Warehouse Store',
        ]);

        $this->category = Category::create([
            'category' => 'Consumable',
            'section_id' => $this->section->id,
        ]);

        $this->unit = Unit::create(['nama' => 'PCS']);

        $this->user = User::factory()->create([
            'username' => 'stock.counter',
            'estate_id' => $this->estate->id,
            'role_id' => $this->estateRole->id,
            'not_active' => false,
        ]);
        $this->user->assignRole($this->estateRole);
        $this->user->givePermissionTo(Permission::all());
    }

    public function test_create_session_generates_material_stock_snapshot(): void
    {
        $material = $this->createMaterial('MAT-KLT-000001', 10);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/material-stock-opnames', [
                'estate_id' => $this->estate->id,
                'section_id' => $this->section->id,
                'opname_date' => '2026-08-20',
                'notes' => 'Monthly stock count',
            ])
            ->assertCreated();

        $opnameId = $response->json('data.id');

        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opnameId,
            'status' => 'Draft',
            'total_items' => 1,
        ]);

        $this->assertDatabaseHas('material_stock_opname_items', [
            'opname_id' => $opnameId,
            'material_code' => $material->code,
            'system_stock_snapshot' => 10,
            'status' => 'Open',
        ]);
    }

    public function test_counting_physical_stock_does_not_change_material_stock(): void
    {
        $material = $this->createMaterial('MAT-KLT-000002', 10, 5);
        $opname = $this->createOpname();
        $item = MaterialStockOpnameItem::where('opname_id', $opname->id)->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/material-stock-opnames/{$opname->id}/items/{$item->id}/count", [
                'physical_stock' => 7,
                'variance_reason' => 'Found shortage during count',
            ])
            ->assertOk()
            ->assertJsonPath('data.variance_qty', -3)
            ->assertJsonPath('data.variance_value', -15);

        $this->assertSame(10.0, (float) $material->fresh()->stock);
        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Counting',
            'counted_items' => 1,
        ]);
    }

    public function test_submit_review_requires_reason_for_variance(): void
    {
        $this->createMaterial('MAT-KLT-000003', 10);
        $opname = $this->createOpname();
        $item = MaterialStockOpnameItem::where('opname_id', $opname->id)->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/material-stock-opnames/{$opname->id}/items/{$item->id}/count", [
                'physical_stock' => 9,
            ])
            ->assertOk();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-review")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['variance_reason']);
    }

    public function test_submit_review_allows_variance_without_reason_inside_tolerance(): void
    {
        Setting::set('stock_opname_qty_tolerance', 2, 'number', 'stock_opname');
        Setting::set('stock_opname_value_tolerance', 1000, 'number', 'stock_opname');

        $this->createMaterial('MAT-KLT-000033', 10, 100);
        $opname = $this->createOpname();
        $item = MaterialStockOpnameItem::where('opname_id', $opname->id)->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/material-stock-opnames/{$opname->id}/items/{$item->id}/count", [
                'physical_stock' => 9,
            ])
            ->assertOk();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-review")
            ->assertOk()
            ->assertJsonPath('data.status', 'Review');
    }

    public function test_non_admin_cannot_edit_material_stock_directly(): void
    {
        $material = $this->createMaterial('MAT-KLT-000034', 10);

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/materials/{$material->code}", [
                'stock' => 99,
            ])
            ->assertForbidden();

        $this->assertSame(10.0, (float) $material->fresh()->stock);
    }

    public function test_import_counts_from_csv_updates_snapshot_items(): void
    {
        $materialOne = $this->createMaterial('MAT-KLT-000035', 10, 5);
        $materialTwo = $this->createMaterial('MAT-KLT-000036', 20, 2);
        $opname = $this->createOpname();

        $csv = implode("\n", [
            'material_code,physical_stock,variance_reason,condition_note',
            "{$materialOne->code},8,Shortage confirmed,Rack A1",
            "{$materialTwo->code},23,Surplus confirmed,Rack B2",
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/import-counts", [
                'file' => UploadedFile::fake()->createWithContent('counts.csv', $csv),
            ])
            ->assertOk()
            ->assertJsonPath('imported', 2);

        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Counting',
            'counted_items' => 2,
            'total_items' => 2,
            'total_variance_qty' => 1,
            'total_variance_value' => -4,
        ]);

        $this->assertDatabaseHas('material_stock_opname_items', [
            'opname_id' => $opname->id,
            'material_code' => $materialOne->code,
            'physical_stock' => 8,
            'variance_qty' => -2,
            'variance_value' => -10,
            'variance_reason' => 'Shortage confirmed',
            'condition_note' => 'Rack A1',
            'status' => 'Counted',
        ]);
        $this->assertDatabaseHas('material_stock_opname_logs', [
            'opname_id' => $opname->id,
            'action' => 'counts_imported',
        ]);
    }

    public function test_bulk_counts_updates_snapshot_items(): void
    {
        $materialOne = $this->createMaterial('MAT-KLT-000040', 10, 5);
        $materialTwo = $this->createMaterial('MAT-KLT-000041', 20, 2);
        $opname = $this->createOpname();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/bulk-counts", [
                'counts' => [
                    [
                        'material_code' => $materialOne->code,
                        'physical_stock' => 11,
                        'variance_reason' => 'Surplus found',
                    ],
                    [
                        'material_code' => $materialTwo->code,
                        'physical_stock' => 18,
                        'variance_reason' => 'Shortage found',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('imported', 2);

        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Counting',
            'counted_items' => 2,
            'total_variance_qty' => -1,
            'total_variance_value' => 1,
        ]);
    }

    public function test_import_counts_rolls_back_when_csv_contains_unknown_material(): void
    {
        $material = $this->createMaterial('MAT-KLT-000037', 10);
        $opname = $this->createOpname();

        $csv = implode("\n", [
            'material_code,physical_stock,variance_reason',
            "{$material->code},8,Shortage confirmed",
            'MAT-KLT-UNKNOWN,1,Invalid row',
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/import-counts", [
                'file' => UploadedFile::fake()->createWithContent('counts.csv', $csv),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);

        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Draft',
            'counted_items' => 0,
            'total_variance_qty' => 0,
        ]);
        $this->assertDatabaseHas('material_stock_opname_items', [
            'opname_id' => $opname->id,
            'material_code' => $material->code,
            'physical_stock' => null,
            'status' => 'Open',
        ]);
    }

    public function test_post_adjustments_updates_stock_once_and_creates_transaction(): void
    {
        $material = $this->createMaterial('MAT-KLT-000004', 10, 5);
        $opname = $this->createOpname();
        $item = MaterialStockOpnameItem::where('opname_id', $opname->id)->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/material-stock-opnames/{$opname->id}/items/{$item->id}/count", [
                'physical_stock' => 7,
                'variance_reason' => 'Shortage confirmed by warehouse team',
            ])
            ->assertOk();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-review")
            ->assertOk();

        $opname->fresh()->update(['status' => 'Pending Approval']);

        $poster = $this->createApprover('finance.poster', $this->financeRole, ['post-material-stock-opnames']);
        $service = app(MaterialStockOpnameService::class);
        $service->postAdjustments($opname->fresh(), $poster);
        $service->postAdjustments($opname->fresh(), $poster);

        $this->assertSame(7.0, (float) $material->fresh()->stock);
        $this->assertSame(1, Transaction::where('code', $material->code)->count());

        $transaction = Transaction::where('code', $material->code)->firstOrFail();
        $this->assertSame('OUT', $transaction->type);
        $this->assertSame(3.0, (float) $transaction->qty);

        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Posted',
        ]);

        $this->assertDatabaseHas('material_stock_opname_items', [
            'opname_id' => $opname->id,
            'material_code' => $material->code,
            'status' => 'Posted',
            'stock_before_posting' => 10,
            'stock_after_posting' => 7,
            'transaction_id' => $transaction->id,
        ]);
    }

    public function test_submit_approval_creates_pending_approval_request(): void
    {
        $this->createMaterial('MAT-KLT-000005', 10);
        $this->createApprover('manager.user', $this->managerRole);
        $this->createWorkflow(['manager']);
        $opname = $this->createReviewedOpname(9, 'Shortage confirmed');

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-approval")
            ->assertOk()
            ->assertJsonPath('data.status', 'Pending Approval');

        $this->assertDatabaseHas('approval_requests', [
            'reference_table' => 'material_stock_opnames',
            'reference_id' => $opname->id,
            'status' => 'Pending',
            'current_sequence' => 1,
        ]);
    }

    public function test_final_approver_cannot_be_same_user_who_prepared_stock_opname(): void
    {
        $material = $this->createMaterial('MAT-KLT-000042', 10, 5);
        $this->createWorkflow(['estate']);
        $opname = $this->createReviewedOpname(12, 'Surplus confirmed');

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-approval")
            ->assertOk();

        $approval = ApprovalRequest::where('reference_table', 'material_stock_opnames')
            ->where('reference_id', $opname->id)
            ->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'self approval'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['approval']);

        $this->assertSame(10.0, (float) $material->fresh()->stock);
        $this->assertDatabaseHas('approval_requests', [
            'id' => $approval->id,
            'status' => 'Pending',
        ]);
        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Pending Approval',
        ]);
    }

    public function test_final_approval_posts_adjustment_and_marks_request_approved(): void
    {
        $material = $this->createMaterial('MAT-KLT-000006', 10, 5);
        $finance = $this->createApprover('finance.user', $this->financeRole, ['post-material-stock-opnames']);
        $this->createWorkflow(['finance']);
        $opname = $this->createReviewedOpname(12, 'Surplus confirmed');

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-approval")
            ->assertOk();

        $approval = ApprovalRequest::where('reference_table', 'material_stock_opnames')
            ->where('reference_id', $opname->id)
            ->firstOrFail();

        $this->actingAs($finance, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'approved'])
            ->assertOk();

        $this->assertSame(12.0, (float) $material->fresh()->stock);
        $this->assertDatabaseHas('approval_requests', [
            'id' => $approval->id,
            'status' => 'Approved',
        ]);
        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Posted',
        ]);
        $this->assertDatabaseHas('transactions', [
            'code' => $material->code,
            'type' => 'IN',
            'qty' => 2,
        ]);
    }

    public function test_berita_acara_requires_posted_stock_opname(): void
    {
        $this->createMaterial('MAT-KLT-000038', 10);
        $opname = $this->createOpname();

        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/material-stock-opnames/{$opname->id}/berita-acara")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Stock opname belum posted.');
    }

    public function test_berita_acara_pdf_can_be_downloaded_after_posted(): void
    {
        $this->createMaterial('MAT-KLT-000039', 10, 5);
        $finance = $this->createApprover('finance.pdf', $this->financeRole, ['post-material-stock-opnames']);
        $this->createWorkflow(['finance']);
        $opname = $this->createReviewedOpname(12, 'Surplus confirmed');

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-approval")
            ->assertOk();

        $approval = ApprovalRequest::where('reference_table', 'material_stock_opnames')
            ->where('reference_id', $opname->id)
            ->firstOrFail();

        $this->actingAs($finance, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/approve", ['comment' => 'approved'])
            ->assertOk();

        $this->actingAs($this->user, 'sanctum')
            ->get("/api/material-stock-opnames/{$opname->id}/berita-acara")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_dashboard_exposes_stock_opname_reporting_metrics(): void
    {
        $shortageMaterial = $this->createMaterial('MAT-KLT-000043', 10, 5);
        $finance = $this->createApprover('finance.dashboard', $this->financeRole, ['post-material-stock-opnames']);
        $this->createWorkflow(['finance']);

        $postedOpname = $this->createReviewedOpname(7, 'Shortage confirmed');
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$postedOpname->id}/submit-approval")
            ->assertOk();

        $postedApproval = ApprovalRequest::where('reference_table', 'material_stock_opnames')
            ->where('reference_id', $postedOpname->id)
            ->firstOrFail();

        $this->actingAs($finance, 'sanctum')
            ->postJson("/api/approvals/{$postedApproval->id}/approve", ['comment' => 'approved'])
            ->assertOk();

        $shortageMaterial->fresh()->update([
            'stock' => 0,
            'not_active' => true,
        ]);

        $this->createMaterial('MAT-KLT-000044', 20, 2);
        $pendingOpname = $this->createReviewedOpname(18, 'Shortage pending');
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$pendingOpname->id}/submit-approval")
            ->assertOk();

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('stock_opname_stats.pending', 1)
            ->assertJsonPath('stock_opname_stats.posted_this_month', 1)
            ->assertJsonPath('stock_opname_stats.pending_aging.0.opname_code', $pendingOpname->opname_code)
            ->assertJsonPath('stock_opname_stats.top_shortages_this_month.0.material_code', $shortageMaterial->code);
    }

    public function test_reject_marks_stock_opname_rejected_without_changing_stock(): void
    {
        $material = $this->createMaterial('MAT-KLT-000007', 10);
        $finance = $this->createApprover('finance.rejector', $this->financeRole, ['post-material-stock-opnames']);
        $this->createWorkflow(['finance']);
        $opname = $this->createReviewedOpname(8, 'Shortage pending approval');

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-approval")
            ->assertOk();

        $approval = ApprovalRequest::where('reference_table', 'material_stock_opnames')
            ->where('reference_id', $opname->id)
            ->firstOrFail();

        $this->actingAs($finance, 'sanctum')
            ->postJson("/api/approvals/{$approval->id}/reject", ['comment' => 'count evidence incomplete'])
            ->assertOk();

        $this->assertSame(10.0, (float) $material->fresh()->stock);
        $this->assertSame(0, Transaction::where('code', $material->code)->count());
        $this->assertDatabaseHas('material_stock_opnames', [
            'id' => $opname->id,
            'status' => 'Rejected',
        ]);
    }

    private function createOpname(): MaterialStockOpname
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/material-stock-opnames', [
                'estate_id' => $this->estate->id,
                'section_id' => $this->section->id,
                'opname_date' => '2026-08-20',
            ])
            ->assertCreated();

        return MaterialStockOpname::findOrFail($response->json('data.id'));
    }

    private function createMaterial(string $code, float $stock, float $price = 0): Material
    {
        return Material::create([
            'code' => $code,
            'nama' => 'Material ' . $code,
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'section_id' => $this->section->id,
            'estate_id' => $this->estate->id,
            'stock' => $stock,
            'price' => $price,
            'not_active' => false,
        ]);
    }

    private function createReviewedOpname(float $physicalStock, string $reason): MaterialStockOpname
    {
        $opname = $this->createOpname();
        $item = MaterialStockOpnameItem::where('opname_id', $opname->id)->firstOrFail();

        $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/material-stock-opnames/{$opname->id}/items/{$item->id}/count", [
                'physical_stock' => $physicalStock,
                'variance_reason' => $reason,
            ])
            ->assertOk();

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/material-stock-opnames/{$opname->id}/submit-review")
            ->assertOk();

        return $opname->fresh();
    }

    /**
     * @param array<int, string> $stepRoles
     */
    private function createWorkflow(array $stepRoles): ApprovalWorkflow
    {
        $workflow = ApprovalWorkflow::create([
            'name' => 'Stock Opname Test Workflow',
            'module_name' => 'Material Stock Opname',
            'estate_id' => $this->estate->id,
            'is_active' => true,
        ]);

        foreach ($stepRoles as $index => $roleName) {
            $workflow->steps()->create([
                'sequence' => $index + 1,
                'role_name' => $roleName,
                'action_type' => $index === count($stepRoles) - 1 ? 'Approver' : 'Reviewer',
            ]);
        }

        return $workflow->load('steps');
    }

    /**
     * @param array<int, string> $extraPermissions
     */
    private function createApprover(string $username, Role $role, array $extraPermissions = []): User
    {
        $user = User::factory()->create([
            'username' => $username,
            'estate_id' => $this->estate->id,
            'role_id' => $role->id,
            'not_active' => false,
        ]);
        $user->assignRole($role);
        $user->givePermissionTo(array_values(array_unique(array_merge([
            'view-material-stock-opnames',
            'review-material-stock-opnames',
        ], $extraPermissions))));

        return $user;
    }
}
