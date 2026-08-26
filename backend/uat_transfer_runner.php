<?php

use App\Models\Anggota;
use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\Asset;
use App\Models\AssetDepartment;
use App\Models\AssetDivision;
use App\Models\AssetTransferHistory;
use App\Models\Category;
use App\Models\Estate;
use App\Models\Material;
use App\Models\MaterialTransferHistory;
use App\Models\Section;
use App\Models\Transfer;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

$runId = '20260730' . now()->format('His');
$results = [];
$created = [
    'run_id' => $runId,
    'estates' => [],
    'users' => [],
    'workflows' => [],
    'assets' => [],
    'materials' => [],
    'members' => [],
    'transfers' => [],
];

$record = function (string $name, bool $passed, array $context = []) use (&$results): void {
    $results[] = [
        'name' => $name,
        'status' => $passed ? 'PASS' : 'FAIL',
        'context' => $context,
    ];
};

$api = function (User $user, string $method, string $uri, array $payload = []) use ($runId): array {
    $token = $user->createToken("uat-transfer-{$runId}")->plainTextToken;
    $server = [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
        'CONTENT_TYPE' => 'application/json',
    ];

    $request = Request::create($uri, $method, [], [], [], $server, json_encode($payload));
    $kernel = app(Kernel::class);
    app('auth')->forgetGuards();
    $response = $kernel->handle($request);
    $kernel->terminate($request, $response);
    app('auth')->forgetGuards();

    return [
        'status' => $response->getStatusCode(),
        'body' => json_decode($response->getContent(), true) ?: ['raw' => $response->getContent()],
    ];
};

$ensurePermission = function (string $permission): void {
    Permission::findOrCreate($permission, 'web');
};

$ensureRole = function (string $name, array $permissions = []) use ($ensurePermission): Role {
    foreach ($permissions as $permission) {
        $ensurePermission($permission);
    }

    $role = Role::findOrCreate($name, 'web');
    if ($permissions) {
        $role->givePermissionTo($permissions);
    }

    return $role;
};

$ensureEstate = function (string $code, string $name) use (&$created): Estate {
    $estate = Estate::updateOrCreate(
        ['estate_id' => $code],
        [
            'estate' => $name,
            'estate_join' => substr($code, 0, 3),
            'bu' => 'UAT',
            'region' => 'UAT',
        ]
    );
    $created['estates'][] = "{$estate->estate_id}:{$estate->id}";

    return $estate;
};

$ensureUser = function (string $username, Estate $estate, Role $role, array $permissions, AssetDepartment $department, AssetDivision $division) use (&$created): User {
    $user = User::updateOrCreate(
        ['username' => $username],
        [
            'name' => strtoupper($username),
            'email' => "{$username}@example.test",
            'password' => Hash::make('user123'),
            'estate_id' => $estate->id,
            'role_id' => $role->id,
            'not_active' => false,
            'access_setup_required' => false,
            'guid' => $username,
            'domain' => 'uat',
        ]
    );

    $user->syncRoles([$role]);
    $user->givePermissionTo($permissions);
    $user->assetDepartments()->syncWithoutDetaching([$department->id]);
    $user->assetDivisions()->syncWithoutDetaching([$division->id]);
    $created['users'][] = "{$user->username}:{$user->id}";

    return $user->fresh();
};

$ensureMember = function (Estate $estate, string $suffix, Section $section) use ($runId, &$created): Anggota {
    $sapId = substr("UT{$suffix}" . substr($runId, -6), 0, 15);
    $member = Anggota::updateOrCreate(
        ['sap_id' => $sapId],
        [
            'nik' => $sapId,
            'nama' => substr("UAT Member {$suffix}", 0, 25),
            'position' => 'Tester',
            'email' => strtolower("member_{$suffix}_{$runId}@example.test"),
            'section_id' => $section->id,
            'estate_id' => $estate->id,
            'not_active' => false,
            'create_by' => 'uat',
            'update_by' => 'uat',
        ]
    );
    $created['members'][] = "{$member->sap_id}:{$estate->estate_id}";

    return $member;
};

$ensureWorkflow = function (Estate $estate) use ($runId, &$created): ApprovalWorkflow {
    $workflow = ApprovalWorkflow::create([
        'name' => "UAT Transfer {$estate->estate_id} {$runId}",
        'module_name' => 'Transfer',
        'estate_id' => $estate->id,
        'is_active' => true,
    ]);
    $workflow->steps()->create([
        'sequence' => 1,
        'role_name' => 'estate',
        'action_type' => 'Approver',
    ]);
    $created['workflows'][] = "{$workflow->name}:{$workflow->id}";

    return $workflow;
};

$ensureAsset = function (string $regId, Estate $estate, Section $section, AssetDepartment $department, AssetDivision $division) use (&$created): Asset {
    $asset = Asset::withTrashed()->updateOrCreate(
        ['reg_id' => $regId],
        [
            'asset_no' => $regId,
            'unit_id' => $estate->estate_id,
            'date' => now()->toDateString(),
            'serial_no' => "SN-{$regId}",
            'type' => 'Laptop',
            'manufacture' => 'Dell',
            'series' => 'UAT',
            'section_id' => $section->id,
            'estate_id' => $estate->id,
            'asset_department_id' => $department->id,
            'asset_division_id' => $division->id,
            'anggota_id' => null,
            'not_active' => false,
            'create_by' => 'uat',
            'update_by' => 'uat',
            'source' => 'UAT',
        ]
    );
    if ($asset->trashed()) {
        $asset->restore();
    }
    $created['assets'][] = "{$asset->reg_id}:{$estate->estate_id}";

    return $asset->fresh();
};

$ensureMaterial = function (string $code, Estate $estate, Section $section, Category $category, Unit $unit, float $stock = 50) use (&$created): Material {
    $material = Material::withTrashed()->updateOrCreate(
        ['code' => $code],
        [
            'nama' => "UAT Material {$code}",
            'type' => 'UAT',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'matcode' => substr($code, 0, 10),
            'sn' => $code,
            'min_stock' => 1,
            'price' => 1000,
            'stock' => $stock,
            'pt' => 'UAT',
            'section_id' => $section->id,
            'estate_id' => $estate->id,
            'not_active' => false,
            'create_by' => 'uat',
            'update_by' => 'uat',
        ]
    );
    if ($material->trashed()) {
        $material->restore();
    }
    $created['materials'][] = "{$material->code}:{$estate->estate_id}";

    return $material->fresh();
};

$submitTransfer = function (User $sourceUser, string $type, Estate $toEstate, string $itemId, int $qty = 1, ?string $memberId = null, ?int $fromEstateId = null) use ($api): array {
    $payload = [
        'type' => $type,
        'to_estate_id' => $toEstate->id,
        'items' => [
            [
                'item_id' => $itemId,
                'qty' => $qty,
                'notes' => "UAT {$type}",
            ],
        ],
        'notes' => "UAT {$type} transfer",
    ];
    if ($memberId) {
        $payload['anggota_id'] = $memberId;
    }
    if ($fromEstateId) {
        $payload['from_estate_id'] = $fromEstateId;
    }

    return $api($sourceUser, 'POST', '/api/transfers', $payload);
};

$approveTransfer = function (Transfer $transfer, User $approver) use ($api): array {
    $approval = ApprovalRequest::where('reference_table', 'transfers')
        ->where('reference_id', $transfer->id)
        ->where('status', 'Pending')
        ->first();

    if (!$approval) {
        return ['status' => 0, 'body' => ['message' => 'Pending approval request not found']];
    }

    return $api($approver, 'POST', "/api/approvals/{$approval->id}/approve", [
        'comment' => 'UAT approved',
    ]);
};

$assertTransferApproved = function (Transfer $transfer, User $approver, string $name) use ($approveTransfer, $record): Transfer {
    $approve = $approveTransfer($transfer, $approver);
    $transfer = $transfer->fresh();
    $record($name, $approve['status'] === 200 && $transfer->status === 'Approved', [
        'approve_status' => $approve['status'],
        'transfer_code' => $transfer->transfer_code,
        'transfer_status' => $transfer->status,
        'body' => $approve['body'],
    ]);

    return $transfer;
};

$deactivatedWorkflowIds = [];

try {
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    if (!Schema::hasColumn('assets', 'anggota_id') || !Schema::hasTable('asset_transfer_histories')) {
        throw new RuntimeException('Schema transfer asset belum lengkap. Jalankan migration fitur transfer terlebih dahulu.');
    }

    $transferPermissions = [
        'view-transfers',
        'create-transfers',
        'edit-transfers',
        'delete-transfers',
        'cancel-transfers',
        'download-transfer-ba',
        'view-transfer-history',
        'assign-asset-members',
        'view-assets',
        'view-materials',
        'view-anggotas',
    ];
    $adminRole = $ensureRole('admin', array_merge($transferPermissions, ['edit-assets']));
    $estateRole = $ensureRole('estate', $transferPermissions);
    $ensureRole("uat_no_approver_{$runId}");

    $section = Section::firstOrCreate(['section' => 'UAT'], [
        'section_full' => 'UAT Section',
        'keterangan' => 'UAT',
        'not_active' => false,
    ]);
    $category = Category::firstOrCreate(['category' => 'UAT Transfer Material'], [
        'section_id' => $section->id,
        'not_active' => false,
        'create_by' => 'uat',
    ]);
    $unit = Unit::firstOrCreate(['nama' => 'PCS'], ['keterangan' => 'Pieces']);
    $department = AssetDepartment::firstOrCreate(['name' => 'UAT Transfer Department'], [
        'code' => 'UAT',
        'not_active' => false,
    ]);
    $division = AssetDivision::firstOrCreate([
        'asset_department_id' => $department->id,
        'name' => 'UAT Transfer Division',
    ], [
        'code' => 'UAT',
        'not_active' => false,
    ]);

    $ho = Estate::where('estate_id', 'HO')->first() ?: $ensureEstate('HO', 'Head Office');
    $src = $ensureEstate('U1A', 'UAT Source Estate');
    $dst = $ensureEstate('U2A', 'UAT Destination Estate');
    $negativeNoWorkflowEstate = $ensureEstate('NWF', 'UAT No Workflow');
    $negativeNoApproverEstate = $ensureEstate('NAP', 'UAT No Approver');

    $allEstates = Estate::orderBy('id')->get();

    $usersByEstate = [];
    foreach ($allEstates as $estate) {
        $username = strtolower("uat_est_{$estate->estate_id}_{$runId}");
        $usersByEstate[$estate->id] = $ensureUser($username, $estate, $estateRole, $transferPermissions, $department, $division);
        $ensureMember($estate, $estate->estate_id, $section);
    }

    $admin = $ensureUser("uat_admin_{$runId}", $ho, $adminRole, array_merge($transferPermissions, ['edit-assets']), $department, $division);
    $sourceUser = $usersByEstate[$src->id];
    $destinationUser = $usersByEstate[$dst->id];
    $hoApprover = $usersByEstate[$ho->id] ?? $admin;

    foreach ($allEstates as $estate) {
        $hasReadyWorkflow = ApprovalWorkflow::with('steps')
            ->where('module_name', 'Transfer')
            ->where('estate_id', $estate->id)
            ->where('is_active', true)
            ->get()
            ->contains(function (ApprovalWorkflow $workflow) use ($estate): bool {
                $firstStep = $workflow->steps->where('sequence', 1)->first();
                if (!$firstStep || !$firstStep->role_name) {
                    return false;
                }

                return User::whereHas('role', fn ($query) => $query->where('name', $firstStep->role_name))
                    ->where('estate_id', $estate->id)
                    ->where('not_active', false)
                    ->exists();
            });

        if (!$hasReadyWorkflow) {
            $ensureWorkflow($estate);
        }
    }

    $record('Workflow aktif/ready tersedia untuk semua estate', true, [
        'estate_count' => $allEstates->count(),
    ]);

    $destinationMembers = Anggota::where('estate_id', $dst->id)->where('not_active', false)->get();
    $hoMembers = Anggota::where('estate_id', $ho->id)->where('not_active', false)->get();
    $dstMember = $destinationMembers->first();
    $hoMember = $hoMembers->first();

    $record('Anggota destination estate tersedia untuk assignment asset', (bool) $dstMember, [
        'destination_estate' => $dst->estate_id,
        'member' => $dstMember?->sap_id,
    ]);
    $record('Anggota HO tersedia untuk transfer estate ke HO', (bool) $hoMember, [
        'ho_member' => $hoMember?->sap_id,
    ]);

    $sequence = 1;

    foreach ($allEstates as $estate) {
        if ((int) $estate->id === (int) $ho->id || in_array($estate->estate_id, ['NWF', 'NAP'], true)) {
            continue;
        }

        $member = Anggota::where('estate_id', $estate->id)->where('not_active', false)->first();
        $asset = $ensureAsset('HA' . str_pad((string) $sequence, 6, '0', STR_PAD_LEFT), $ho, $section, $department, $division);
        $response = $submitTransfer($admin, 'Asset', $estate, $asset->reg_id, 1, $member?->sap_id, $ho->id);
        $transfer = isset($response['body']['data']['id']) ? Transfer::find($response['body']['data']['id']) : null;
        $record("HO submit asset transfer ke {$estate->estate_id}", $response['status'] === 201 && $transfer?->status === 'Pending Approval', [
            'status' => $response['status'],
            'body' => $response['body'],
        ]);
        if ($transfer) {
            $created['transfers'][] = $transfer->transfer_code;
            $transfer = $assertTransferApproved($transfer, $usersByEstate[$estate->id], "Approver {$estate->estate_id} approve asset dari HO");
            $assetAfter = $asset->fresh();
            $historyExists = AssetTransferHistory::where('transfer_id', $transfer->id)->where('asset_id', $asset->reg_id)->exists();
            $record("Asset HO berpindah ke {$estate->estate_id} dan history tercatat", (int) $assetAfter->estate_id === (int) $estate->id && $historyExists, [
                'asset' => $assetAfter->reg_id,
                'estate_id' => $assetAfter->estate_id,
                'expected_estate_id' => $estate->id,
                'history_exists' => $historyExists,
            ]);
        }

        $material = $ensureMaterial('HM' . str_pad((string) $sequence, 6, '0', STR_PAD_LEFT), $ho, $section, $category, $unit, 50);
        $beforeStock = $material->stock;
        $response = $submitTransfer($admin, 'Material', $estate, $material->code, 5, $member?->sap_id, $ho->id);
        $transfer = isset($response['body']['data']['id']) ? Transfer::find($response['body']['data']['id']) : null;
        $record("HO submit material transfer ke {$estate->estate_id}", $response['status'] === 201 && $transfer?->status === 'Pending Approval', [
            'status' => $response['status'],
            'body' => $response['body'],
        ]);
        if ($transfer) {
            $created['transfers'][] = $transfer->transfer_code;
            $transfer = $assertTransferApproved($transfer, $usersByEstate[$estate->id], "Approver {$estate->estate_id} approve material dari HO");
            $materialAfter = $material->fresh();
            $historyExists = MaterialTransferHistory::where('transfer_id', $transfer->id)->exists();
            $record("Stock HO berkurang dan material history tercatat untuk {$estate->estate_id}", (float) $materialAfter->stock === (float) ($beforeStock - 5) && $historyExists, [
                'material' => $materialAfter->code,
                'stock_before' => $beforeStock,
                'stock_after' => $materialAfter->stock,
                'history_exists' => $historyExists,
            ]);
        }

        $sequence++;
    }

    $estateAsset = $ensureAsset('EA' . substr($runId, -6), $src, $section, $department, $division);
    $response = $submitTransfer($sourceUser, 'Asset', $dst, $estateAsset->reg_id, 1, $dstMember?->sap_id);
    $estateAssetTransfer = isset($response['body']['data']['id']) ? Transfer::find($response['body']['data']['id']) : null;
    $record('Estate submit asset transfer ke estate lain', $response['status'] === 201 && $estateAssetTransfer?->status === 'Pending Approval', [
        'status' => $response['status'],
        'body' => $response['body'],
    ]);
    if ($estateAssetTransfer) {
        $created['transfers'][] = $estateAssetTransfer->transfer_code;

        $approval = ApprovalRequest::where('reference_table', 'transfers')
            ->where('reference_id', $estateAssetTransfer->id)
            ->where('status', 'Pending')
            ->first();
        $sourceApprove = $approval ? $api($sourceUser, 'POST', "/api/approvals/{$approval->id}/approve", ['comment' => 'source tries']) : ['status' => 0, 'body' => []];
        $record('Source estate tidak bisa approve approval destination', $sourceApprove['status'] === 403, [
            'status' => $sourceApprove['status'],
            'body' => $sourceApprove['body'],
        ]);

        $destinationCancel = $api($destinationUser, 'POST', "/api/transfers/{$estateAssetTransfer->id}/cancel");
        $record('Destination estate tidak bisa cancel transfer source', $destinationCancel['status'] === 403, [
            'status' => $destinationCancel['status'],
            'body' => $destinationCancel['body'],
        ]);

        $statusUpdate = $api($sourceUser, 'PUT', "/api/transfers/{$estateAssetTransfer->id}", ['status' => 'Approved']);
        $record('Status transfer tidak bisa diubah via update umum', $statusUpdate['status'] === 422 && $estateAssetTransfer->fresh()->status === 'Pending Approval', [
            'status' => $statusUpdate['status'],
            'body' => $statusUpdate['body'],
            'transfer_status' => $estateAssetTransfer->fresh()->status,
        ]);

        $duplicate = $submitTransfer($sourceUser, 'Asset', $dst, $estateAsset->reg_id, 1, $dstMember?->sap_id);
        $record('Asset pending tidak bisa diajukan pada transfer lain', $duplicate['status'] === 422, [
            'status' => $duplicate['status'],
            'body' => $duplicate['body'],
        ]);

        $estateAssetTransfer = $assertTransferApproved($estateAssetTransfer, $destinationUser, 'Destination approver approve asset estate ke estate');
        $assetAfter = $estateAsset->fresh();
        $historyExists = AssetTransferHistory::where('transfer_id', $estateAssetTransfer->id)->where('asset_id', $estateAsset->reg_id)->exists();
        $record('Asset estate berpindah ke estate tujuan dan audit history tercatat', (int) $assetAfter->estate_id === (int) $dst->id && $historyExists, [
            'asset' => $assetAfter->reg_id,
            'estate_id' => $assetAfter->estate_id,
            'expected_estate_id' => $dst->id,
            'history_exists' => $historyExists,
        ]);

        $dashboardBefore = $api($destinationUser, 'GET', '/api/dashboard');
        $remindersBefore = collect($dashboardBefore['body']['asset_assignment_reminders'] ?? []);
        $hasReminder = $remindersBefore->contains(fn ($reminder) => ($reminder['asset_id'] ?? null) === $estateAsset->reg_id);
        $record('Dashboard destination menampilkan reminder assignment member sebelum asset diassign', $dashboardBefore['status'] === 200 && $hasReminder, [
            'status' => $dashboardBefore['status'],
            'asset' => $estateAsset->reg_id,
            'reminder_count' => $remindersBefore->count(),
        ]);

        $assignResponse = $api($destinationUser, 'POST', "/api/assets/{$estateAsset->reg_id}/assign-member", [
            'anggota_id' => $dstMember?->sap_id,
        ]);
        $dashboardAfter = $api($destinationUser, 'GET', '/api/dashboard');
        $remindersAfter = collect($dashboardAfter['body']['asset_assignment_reminders'] ?? []);
        $stillHasReminder = $remindersAfter->contains(fn ($reminder) => ($reminder['asset_id'] ?? null) === $estateAsset->reg_id);
        $record('Assign member asset berhasil dan reminder dashboard tertutup', $assignResponse['status'] === 200 && !$stillHasReminder, [
            'assign_status' => $assignResponse['status'],
            'dashboard_status' => $dashboardAfter['status'],
            'asset_anggota_id' => $estateAsset->fresh()->anggota_id,
            'expected_anggota_id' => $dstMember?->sap_id,
            'still_has_reminder' => $stillHasReminder,
        ]);
    }

    $estateMaterial = $ensureMaterial('EM' . substr($runId, -6), $src, $section, $category, $unit, 40);
    $stockBefore = $estateMaterial->stock;
    $response = $submitTransfer($sourceUser, 'Material', $dst, $estateMaterial->code, 4, $dstMember?->sap_id);
    $estateMaterialTransfer = isset($response['body']['data']['id']) ? Transfer::find($response['body']['data']['id']) : null;
    $record('Estate submit material transfer ke estate lain', $response['status'] === 201 && $estateMaterialTransfer?->status === 'Pending Approval', [
        'status' => $response['status'],
        'body' => $response['body'],
    ]);
    if ($estateMaterialTransfer) {
        $created['transfers'][] = $estateMaterialTransfer->transfer_code;
        $estateMaterialTransfer = $assertTransferApproved($estateMaterialTransfer, $destinationUser, 'Destination approver approve material estate ke estate');
        $record('Stock estate source berkurang dan material history tercatat', (float) $estateMaterial->fresh()->stock === (float) ($stockBefore - 4) && MaterialTransferHistory::where('transfer_id', $estateMaterialTransfer->id)->exists(), [
            'stock_before' => $stockBefore,
            'stock_after' => $estateMaterial->fresh()->stock,
        ]);
    }

    $assetToHo = $ensureAsset('EH' . substr($runId, -6), $src, $section, $department, $division);
    $response = $submitTransfer($sourceUser, 'Asset', $ho, $assetToHo->reg_id, 1, $hoMember?->sap_id);
    $assetToHoTransfer = isset($response['body']['data']['id']) ? Transfer::find($response['body']['data']['id']) : null;
    $record('Estate submit asset transfer ke HO', $response['status'] === 201 && $assetToHoTransfer?->status === 'Pending Approval', [
        'status' => $response['status'],
        'body' => $response['body'],
    ]);
    if ($assetToHoTransfer) {
        $created['transfers'][] = $assetToHoTransfer->transfer_code;
        $assetToHoTransfer = $assertTransferApproved($assetToHoTransfer, $hoApprover, 'HO approver approve asset estate ke HO');
        $record('Asset estate berpindah ke HO dan audit history tercatat', (int) $assetToHo->fresh()->estate_id === (int) $ho->id && AssetTransferHistory::where('transfer_id', $assetToHoTransfer->id)->exists(), [
            'asset' => $assetToHo->reg_id,
            'estate_id' => $assetToHo->fresh()->estate_id,
            'expected_estate_id' => $ho->id,
        ]);
    }

    $materialToHo = $ensureMaterial('EH' . substr($runId, -6), $src, $section, $category, $unit, 40);
    $stockBefore = $materialToHo->stock;
    $response = $submitTransfer($sourceUser, 'Material', $ho, $materialToHo->code, 4, $hoMember?->sap_id);
    $materialToHoTransfer = isset($response['body']['data']['id']) ? Transfer::find($response['body']['data']['id']) : null;
    $record('Estate submit material transfer ke HO', $response['status'] === 201 && $materialToHoTransfer?->status === 'Pending Approval', [
        'status' => $response['status'],
        'body' => $response['body'],
    ]);
    if ($materialToHoTransfer) {
        $created['transfers'][] = $materialToHoTransfer->transfer_code;
        $materialToHoTransfer = $assertTransferApproved($materialToHoTransfer, $hoApprover, 'HO approver approve material estate ke HO');
        $record('Stock estate source ke HO berkurang dan material history tercatat', (float) $materialToHo->fresh()->stock === (float) ($stockBefore - 4) && MaterialTransferHistory::where('transfer_id', $materialToHoTransfer->id)->exists(), [
            'stock_before' => $stockBefore,
            'stock_after' => $materialToHo->fresh()->stock,
        ]);
    }

    $badAsset = $ensureAsset('BD' . substr($runId, -6), $src, $section, $department, $division);
    $badAsset->update(['asset_department_id' => null, 'asset_division_id' => null]);
    $badAssetResponse = $submitTransfer($sourceUser, 'Asset', $dst, $badAsset->reg_id, 1, $dstMember?->sap_id);
    $record('Asset tanpa department/division ditolak', $badAssetResponse['status'] === 422, [
        'status' => $badAssetResponse['status'],
        'body' => $badAssetResponse['body'],
    ]);

    $negativeMaterial = $ensureMaterial('NG' . substr($runId, -6), $src, $section, $category, $unit, 20);
    $activeWorkflowIds = ApprovalWorkflow::where('module_name', 'Transfer')
        ->where(function ($query) use ($negativeNoWorkflowEstate) {
            $query->whereNull('estate_id')->orWhere('estate_id', $negativeNoWorkflowEstate->id);
        })
        ->where('is_active', true)
        ->pluck('id')
        ->all();
    if ($activeWorkflowIds) {
        ApprovalWorkflow::whereIn('id', $activeWorkflowIds)->update(['is_active' => false]);
        $deactivatedWorkflowIds = array_merge($deactivatedWorkflowIds, $activeWorkflowIds);
    }
    $noWorkflowResponse = $submitTransfer($sourceUser, 'Material', $negativeNoWorkflowEstate, $negativeMaterial->code, 1);
    $record('Submit tanpa workflow ditolak', $noWorkflowResponse['status'] === 422, [
        'status' => $noWorkflowResponse['status'],
        'body' => $noWorkflowResponse['body'],
    ]);
    if ($activeWorkflowIds) {
        ApprovalWorkflow::whereIn('id', $activeWorkflowIds)->update(['is_active' => true]);
        $deactivatedWorkflowIds = array_values(array_diff($deactivatedWorkflowIds, $activeWorkflowIds));
    }

    $activeWorkflowIds = ApprovalWorkflow::where('module_name', 'Transfer')
        ->where(function ($query) use ($negativeNoApproverEstate) {
            $query->whereNull('estate_id')->orWhere('estate_id', $negativeNoApproverEstate->id);
        })
        ->where('is_active', true)
        ->pluck('id')
        ->all();
    if ($activeWorkflowIds) {
        ApprovalWorkflow::whereIn('id', $activeWorkflowIds)->update(['is_active' => false]);
        $deactivatedWorkflowIds = array_merge($deactivatedWorkflowIds, $activeWorkflowIds);
    }
    $badWorkflow = ApprovalWorkflow::create([
        'name' => "UAT Transfer No Approver {$runId}",
        'module_name' => 'Transfer',
        'estate_id' => $negativeNoApproverEstate->id,
        'is_active' => true,
    ]);
    $badWorkflow->steps()->create([
        'sequence' => 1,
        'role_name' => "uat_no_approver_{$runId}",
        'action_type' => 'Approver',
    ]);
    $created['workflows'][] = "{$badWorkflow->name}:{$badWorkflow->id}";
    $noApproverResponse = $submitTransfer($sourceUser, 'Material', $negativeNoApproverEstate, $negativeMaterial->code, 1);
    $record('Workflow tanpa approver aktif ditolak', $noApproverResponse['status'] === 422, [
        'status' => $noApproverResponse['status'],
        'body' => $noApproverResponse['body'],
    ]);
    $badWorkflow->update(['is_active' => false]);
    if ($activeWorkflowIds) {
        ApprovalWorkflow::whereIn('id', $activeWorkflowIds)->update(['is_active' => true]);
        $deactivatedWorkflowIds = array_values(array_diff($deactivatedWorkflowIds, $activeWorkflowIds));
    }

    $ensureWorkflow($negativeNoWorkflowEstate);
    $ensureWorkflow($negativeNoApproverEstate);
} catch (Throwable $e) {
    $record('UAT runner exception', false, [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
} finally {
    if ($deactivatedWorkflowIds) {
        ApprovalWorkflow::whereIn('id', array_unique($deactivatedWorkflowIds))->update(['is_active' => true]);
    }
}

$summary = [
    'run_id' => $runId,
    'passed' => collect($results)->where('status', 'PASS')->count(),
    'failed' => collect($results)->where('status', 'FAIL')->count(),
    'created' => $created,
    'results' => $results,
];

$dir = storage_path('app/uat');
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}
$path = "{$dir}/transfer-{$runId}.json";
file_put_contents($path, json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

echo json_encode([
    'run_id' => $runId,
    'passed' => $summary['passed'],
    'failed' => $summary['failed'],
    'result_path' => $path,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
