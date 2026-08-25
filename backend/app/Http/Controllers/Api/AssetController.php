<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithAssetOwnershipScope;
use App\Http\Controllers\Controller;
use App\Mail\AssetDamageReportedMail;
use App\Models\Anggota;
use App\Models\Asset;
use App\Models\Estate;
use App\Models\TransCondition;
use App\Models\TransMaintenance;
use App\Models\TransferItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssetController extends Controller implements HasMiddleware
{
    use InteractsWithAssetOwnershipScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-assets', only: ['index', 'show']),
            new Middleware('permission:create-assets', only: ['store', 'generateRegId']),
            new Middleware('permission:edit-assets', only: ['update']),
            new Middleware('permission:delete-assets', only: ['destroy']),
            new Middleware('permission:assign-asset-members|edit-assets', only: ['assignMember']),
            new Middleware('permission:create-asset-reports', only: ['reportDamage']),
        ];
    }

    public function generateRegId(Request $request)
    {
        $estate = $this->resolveRegistrationEstate($request);

        return response()->json([
            'data' => [
                'reg_id' => $this->nextAssetRegId($estate),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Asset::with(['section', 'assetReg', 'vendor', 'estate', 'department', 'division', 'anggota', 'latestCondition']);
        $estateId = $this->isHeadOfficeUser()
            ? ($request->filled('estate_id') ? (int) $request->estate_id : null)
            : $this->currentEstateId();

        $this->applyAssetVisibilityScope($query, $estateId);

        if ($request->has('section_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('section_id', $request->section_id);
            });
        }

        if ($request->filled('asset_department_id')) {
            $query->where('asset_department_id', $request->integer('asset_department_id'));
        }

        if ($request->filled('asset_division_id')) {
            $query->where('asset_division_id', $request->integer('asset_division_id'));
        }

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('reg_id', 'like', "%{$request->search}%")
                  ->orWhere('asset_no', 'like', "%{$request->search}%")
                  ->orWhere('serial_no', 'like', "%{$request->search}%");
            });
        }

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_no' => 'required|max:25',
            'unit_id' => 'nullable|max:25',
            'date' => 'nullable|date',
            'serial_no' => 'required',
            'type_id' => 'required|exists:asset_regs,id',
            'type' => 'required|max:25',
            'manufacture' => 'required|max:50',
            'series' => 'required|max:25',
            'section_id' => 'nullable|exists:sections,id',
            'alokasi' => 'nullable|max:10',
            'keterangan' => 'nullable',
            'vendor_id' => 'nullable|exists:vendors,id',
            'estate_id' => $this->isHeadOfficeUser() ? 'required|exists:estates,id' : 'nullable|exists:estates,id',
            'asset_department_id' => 'required|exists:asset_departments,id',
            'asset_division_id' => 'required|exists:asset_divisions,id',
            'anggota_id' => 'nullable|exists:anggotas,sap_id',
            'source' => 'nullable|max:20',
        ]);

        $this->ensureDepartmentDivisionMatch($validated['asset_department_id'], $validated['asset_division_id']);

        $estate = $this->resolveRegistrationEstate($request);
        $validated['estate_id'] = $estate->id;
        $this->ensureAnggotaIsActive($validated['anggota_id'] ?? null);
        $validated['create_by'] = mb_substr(Auth::user()->username ?? 'system', 0, 20);

        $asset = DB::transaction(function () use ($estate, $validated) {
            $validated['reg_id'] = $this->nextAssetRegId($estate, true);

            return Asset::create($validated);
        });

        return response()->json(['message' => 'Asset created successfully', 'data' => $asset], 201);
    }

    public function show(Asset $asset)
    {
        $this->ensureAssetVisibility($asset);

        $asset->load([
            'section',
            'assetReg',
            'maintenances',
            'conditions',
            'latestCondition',
            'vendor',
            'estate',
            'department',
            'division',
            'anggota',
            'transferHistories.transfer',
            'transferHistories.fromEstate',
            'transferHistories.toEstate',
            'transferHistories.targetAnggota',
            'writeOffRequests.approvalRequests.logs',
        ]);

        // Riwayat transfer yang melibatkan aset ini
        $transferHistory = TransferItem::where('item_id', $asset->reg_id)
            ->where('item_type', 'Asset')
            ->with(['transfer' => fn($q) => $q->with(['fromEstate', 'toEstate', 'approvalRequests.logs'])])
            ->orderByDesc('id')
            ->get();

        $data = $asset->toArray();
        $data['transfer_history'] = $transferHistory;

        return response()->json(['data' => $data]);
    }

    public function update(Request $request, Asset $asset)
    {
        $validated = $request->validate([
            'asset_no' => 'nullable|max:25',
            'unit_id' => 'nullable|max:25',
            'date' => 'nullable|date',
            'serial_no' => 'nullable',
            'type_id' => 'sometimes|required|exists:asset_regs,id',
            'type' => 'sometimes|required|max:25',
            'manufacture' => 'sometimes|required|max:50',
            'series' => 'sometimes|required|max:25',
            'section_id' => 'sometimes|nullable|exists:sections,id',
            'alokasi' => 'nullable|max:10',
            'keterangan' => 'nullable',
            'vendor_id' => 'nullable|exists:vendors,id',
            'estate_id' => 'sometimes|required|exists:estates,id',
            'asset_department_id' => 'sometimes|nullable|exists:asset_departments,id',
            'asset_division_id' => 'sometimes|nullable|exists:asset_divisions,id',
            'anggota_id' => 'sometimes|nullable|exists:anggotas,sap_id',
            'not_active' => 'boolean',
        ]);

        $this->ensureAssetVisibility($asset);

        $departmentId = $validated['asset_department_id'] ?? $asset->asset_department_id;
        $divisionId = $validated['asset_division_id'] ?? $asset->asset_division_id;
        if (($departmentId && !$divisionId) || (!$departmentId && $divisionId)) {
            abort(422, 'Department dan Divisi asset harus diisi bersama.');
        }

        if ($departmentId && $divisionId) {
            $this->ensureDepartmentDivisionMatch((int) $departmentId, (int) $divisionId);
        }

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $this->ensureAnggotaIsActive($validated['anggota_id'] ?? $asset->anggota_id);

        $validated['update_by'] = mb_substr(Auth::user()->username ?? 'system', 0, 20);

        $asset->update($validated);
        return response()->json(['message' => 'Asset updated successfully', 'data' => $asset]);
    }

    public function assignMember(Request $request, Asset $asset)
    {
        $this->ensureAssetVisibility($asset);

        $validated = $request->validate([
            'anggota_id' => 'nullable|exists:anggotas,sap_id',
        ]);

        if (!$asset->estate_id) {
            abort(422, 'Estate asset harus terisi sebelum assignment member.');
        }

        $this->ensureAnggotaIsActive($validated['anggota_id'] ?? null);

        $asset->update([
            'anggota_id' => $validated['anggota_id'] ?? null,
            'update_by' => mb_substr(Auth::user()->username ?? 'system', 0, 20),
        ]);

        return response()->json([
            'message' => 'Asset member assignment updated successfully',
            'data' => $asset->load('anggota'),
        ]);
    }

    public function reportDamage(Request $request, Asset $asset)
    {
        $this->ensureAssetVisibility($asset);

        $validated = $request->validate([
            'date' => 'required|date',
            'kondisi' => 'required|in:Bad,Broken',
            'remarks' => 'required|string|max:1000',
            'create_maintenance' => 'sometimes|boolean',
            'terima' => [Rule::requiredIf($request->boolean('create_maintenance')), 'nullable', 'date'],
            'target' => [Rule::requiredIf($request->boolean('create_maintenance')), 'nullable', 'date', 'after_or_equal:terima'],
            'sap1' => [Rule::requiredIf($request->boolean('create_maintenance')), 'nullable', 'max:15'],
            'nama1' => [Rule::requiredIf($request->boolean('create_maintenance')), 'nullable', 'max:50'],
            'sent_' => [Rule::requiredIf($request->boolean('create_maintenance')), 'nullable', 'max:15'],
            'keterangan' => 'nullable|string|max:1000',
            'action_remark' => 'nullable|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        if ($request->boolean('create_maintenance')) {
            $validated = $this->normalizeDamageMaintenancePicFields($validated);
        }

        $username = Auth::user()->username ?? Auth::user()->name ?? 'system';
        $username = mb_substr($username, 0, 20);
        $attachmentPath = null;

        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('maintenances', 'public');
        }

        try {
            $result = DB::transaction(function () use ($asset, $validated, $username, $attachmentPath) {
                $condition = TransCondition::create([
                    'reg_id' => $asset->reg_id,
                    'date' => $validated['date'],
                    'kondisi' => $validated['kondisi'],
                    'remarks' => $validated['remarks'],
                    'create_by' => $username,
                    'create_date' => now(),
                ]);

                $maintenance = null;
                if ((bool) ($validated['create_maintenance'] ?? false)) {
                    $maintenance = TransMaintenance::create([
                        'reg_id' => $asset->reg_id,
                        'terima' => $validated['terima'],
                        'target' => $validated['target'],
                        'sap1' => $validated['sap1'],
                        'nama1' => $validated['nama1'],
                        'sent_' => $validated['sent_'],
                        'kondisi' => $validated['kondisi'],
                        'keterangan' => $validated['keterangan'] ?? $validated['remarks'],
                        'action_remark' => $validated['action_remark'] ?? null,
                        'attachment' => $attachmentPath,
                        'status' => 'Progress',
                        'validasi' => false,
                        'create_by' => $username,
                        'create_date' => now(),
                    ]);
                }

                return [$condition, $maintenance];
            });
        } catch (\Throwable $e) {
            if ($attachmentPath) {
                Storage::disk('public')->delete($attachmentPath);
            }

            throw $e;
        }

        $asset->loadMissing('estate');
        $oversightEmails = $this->transferOversightCcEmails([]);
        if (!empty($oversightEmails)) {
            $this->sendEmailIfEnabled(
                $oversightEmails,
                new AssetDamageReportedMail($asset, $result[0], $result[1])
            );
        }

        return response()->json([
            'message' => 'Laporan kerusakan asset berhasil dibuat',
            'data' => [
                'condition' => $result[0],
                'maintenance' => $result[1],
            ],
        ], 201);
    }

    public function destroy(Asset $asset)
    {
        $this->ensureAssetVisibility($asset);

        $asset->delete();
        return response()->json(['message' => 'Asset deleted successfully']);
    }

    private function ensureDepartmentDivisionMatch(int $departmentId, int $divisionId): void
    {
        $exists = \App\Models\AssetDivision::whereKey($divisionId)
            ->where('asset_department_id', $departmentId)
            ->exists();

        abort_unless($exists, 422, 'Division harus berada di department asset yang dipilih.');
    }

    private function ensureAnggotaIsActive(?string $anggotaId): void
    {
        if (!$anggotaId) {
            return;
        }

        $exists = \App\Models\Anggota::whereKey($anggotaId)
            ->where('not_active', false)
            ->exists();

        abort_unless($exists, 422, 'Anggota penerima harus aktif.');
    }

    private function normalizeDamageMaintenancePicFields(array $data): array
    {
        $sapId = trim((string) ($data['sap1'] ?? ''));

        if ($sapId === '') {
            throw ValidationException::withMessages([
                'sap1' => ['PIC maintenance wajib dipilih dari data anggota aktif.'],
            ]);
        }

        $member = Anggota::query()
            ->whereKey($sapId)
            ->where('not_active', false)
            ->first(['sap_id', 'nama']);

        if (!$member) {
            throw ValidationException::withMessages([
                'sap1' => ['PIC maintenance harus dipilih dari data anggota aktif.'],
            ]);
        }

        $data['sap1'] = (string) $member->sap_id;
        $data['nama1'] = mb_substr((string) $member->nama, 0, 50);

        return $data;
    }

    private function resolveRegistrationEstate(Request $request): Estate
    {
        if ($this->isHeadOfficeUser()) {
            if (!$request->filled('estate_id')) {
                throw ValidationException::withMessages([
                    'estate_id' => ['Estate is required to generate Reg ID.'],
                ]);
            }

            return Estate::findOrFail($request->integer('estate_id'));
        }

        $estate = $this->authUser()->estate;

        if (!$estate) {
            throw ValidationException::withMessages([
                'estate_id' => ['Current user estate is required to generate Reg ID.'],
            ]);
        }

        return $estate;
    }

    private function nextAssetRegId(Estate $estate, bool $lock = false): string
    {
        $estateCode = strtoupper($estate->estate_id);
        $prefix = "AST-{$estateCode}-";

        $query = Asset::withTrashed()
            ->where('reg_id', 'like', $prefix . '%');

        if ($lock) {
            $query->lockForUpdate();
        }

        $lastNumber = $query->pluck('reg_id')
            ->map(function (string $regId) use ($prefix) {
                $number = substr($regId, strlen($prefix));

                return ctype_digit($number) ? (int) $number : 0;
            })
            ->max() ?? 0;

        return $prefix . str_pad((string) ($lastNumber + 1), 3, '0', STR_PAD_LEFT);
    }
}
