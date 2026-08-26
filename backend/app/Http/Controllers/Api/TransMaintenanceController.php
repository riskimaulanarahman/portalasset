<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithAssetOwnershipScope;
use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\Asset;
use App\Models\TransCondition;
use App\Models\TransMaintenance;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TransMaintenanceController extends Controller implements HasMiddleware
{
    use InteractsWithAssetOwnershipScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-asset-maintenances', only: ['index', 'show']),
            new Middleware('permission:create-asset-maintenances', only: ['store']),
            new Middleware('permission:edit-asset-maintenances', only: ['update']),
            new Middleware('permission:delete-asset-maintenances', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = TransMaintenance::with(['asset.section', 'asset.estate']);

        if ($request->filled('reg_id')) {
            $query->where('reg_id', $request->reg_id);
        }
            $query->whereHas('asset', fn($q) => $this->applyAssetVisibilityScope(
                $q,
                $request->filled('estate_id') ? $request->integer('estate_id') : null
            ));

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $query->orderByDesc('id');

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reg_id'        => 'required|exists:assets,reg_id',
            'terima'        => 'required|date',
            'target'        => 'required|date|after_or_equal:terima',
            'selesai'       => 'nullable|date',
            'sap1'          => 'required|max:15',
            'nama1'         => 'required|max:50',
            'sap2'          => 'nullable|max:15',
            'nama2'         => 'nullable|max:50',
            'sap3'          => 'nullable|max:15',
            'nama3'         => 'nullable|max:50',
            'sent_'         => 'required|max:15',
            'kondisi'       => 'required|in:Good,Bad,Broken',
            'keterangan'    => 'nullable|string',
            'action_remark' => 'nullable|string',
            'attachment'    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'status'        => 'nullable|in:Progress,Done',
            'validasi'      => 'nullable|boolean',
        ]);

        $asset = Asset::findOrFail($validated['reg_id']);
        $this->ensureAssetVisibility($asset);
        $validated = $this->normalizeMaintenancePicFields($validated, true);
        $this->ensureCompletionFields($validated);

        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('maintenances', 'public');
        }

        $username = Auth::user()->username ?? Auth::user()->name ?? 'system';

        $maintenance = TransMaintenance::create(array_merge($validated, [
            'create_by'   => $username,
            'create_date' => now(),
            'status'      => $validated['status'] ?? 'Progress',
        ]));

        if (($maintenance->status ?? 'Progress') === 'Done') {
            $this->createCompletedMaintenanceCondition($maintenance, $username);
        }

        return response()->json(['message' => 'Maintenance berhasil dibuat', 'data' => $maintenance->load('asset')], 201);
    }

    public function show(TransMaintenance $assetMaintenance)
    {
        $this->ensureAssetVisibility($assetMaintenance->asset);

        return response()->json(['data' => $assetMaintenance->load('asset.section', 'asset.estate')]);
    }

    public function update(Request $request, TransMaintenance $assetMaintenance)
    {
        $this->ensureAssetVisibility($assetMaintenance->asset);

        $validated = $request->validate([
            'terima'        => 'sometimes|date',
            'target'        => 'sometimes|date',
            'selesai'       => 'nullable|date',
            'sap1'          => 'sometimes|max:15',
            'nama1'         => 'sometimes|max:50',
            'sap2'          => 'nullable|max:15',
            'nama2'         => 'nullable|max:50',
            'sap3'          => 'nullable|max:15',
            'nama3'         => 'nullable|max:50',
            'sent_'         => 'sometimes|max:15',
            'kondisi'       => 'sometimes|in:Good,Bad,Broken',
            'keterangan'    => 'nullable|string',
            'action_remark' => 'nullable|string',
            'attachment'    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'status'        => 'nullable|in:Progress,Done',
            'validasi'      => 'nullable|boolean',
        ]);
        $validated = $this->normalizeMaintenancePicFields($validated);
        $this->ensureCompletionFields($validated, $assetMaintenance);

        $wasDone = $assetMaintenance->status === 'Done';

        if ($request->hasFile('attachment')) {
            if ($assetMaintenance->attachment) {
                Storage::disk('public')->delete($assetMaintenance->attachment);
            }
            $validated['attachment'] = $request->file('attachment')->store('maintenances', 'public');
        }

        $validated['update_by']   = Auth::user()->username ?? Auth::user()->name ?? 'system';
        $validated['update_date'] = now();
        $username = $validated['update_by'];

        DB::transaction(function () use ($assetMaintenance, $validated, $wasDone, $username) {
            $assetMaintenance->update($validated);

            if (!$wasDone && $assetMaintenance->status === 'Done') {
                $this->createCompletedMaintenanceCondition($assetMaintenance, $username);
            }
        });

        return response()->json(['message' => 'Maintenance berhasil diperbarui', 'data' => $assetMaintenance]);
    }

    public function destroy(TransMaintenance $assetMaintenance)
    {
        $this->ensureAssetVisibility($assetMaintenance->asset);

        if ($assetMaintenance->attachment) {
            Storage::disk('public')->delete($assetMaintenance->attachment);
        }

        $assetMaintenance->delete();

        return response()->json(['message' => 'Maintenance berhasil dihapus']);
    }

    private function normalizeMaintenancePicFields(array $data, bool $requirePrimary = false): array
    {
        foreach ([1, 2, 3] as $slot) {
            $sapKey = "sap{$slot}";
            $nameKey = "nama{$slot}";

            if (!array_key_exists($sapKey, $data)) {
                unset($data[$nameKey]);
                continue;
            }

            $sapId = trim((string) ($data[$sapKey] ?? ''));

            if ($sapId === '') {
                if ($slot === 1 && $requirePrimary) {
                    throw ValidationException::withMessages([
                        $sapKey => ["PIC {$slot} wajib dipilih dari data anggota aktif."],
                    ]);
                }

                $data[$sapKey] = null;
                $data[$nameKey] = null;
                continue;
            }

            $member = Anggota::query()
                ->whereKey($sapId)
                ->where('not_active', false)
                ->first(['sap_id', 'nama']);

            if (!$member) {
                throw ValidationException::withMessages([
                    $sapKey => ["PIC {$slot} harus dipilih dari data anggota aktif."],
                ]);
            }

            $data[$sapKey] = (string) $member->sap_id;
            $data[$nameKey] = mb_substr((string) $member->nama, 0, 50);
        }

        return $data;
    }

    private function ensureCompletionFields(array $data, ?TransMaintenance $maintenance = null): void
    {
        $status = $data['status'] ?? $maintenance?->status;

        if ($status !== 'Done') {
            return;
        }

        $selesai = $data['selesai'] ?? $maintenance?->selesai;
        $actionRemark = $data['action_remark'] ?? $maintenance?->action_remark;
        $errors = [];

        if (!$selesai) {
            $errors['selesai'] = ['Tanggal selesai wajib diisi saat status Done.'];
        }

        if (!is_string($actionRemark) || trim($actionRemark) === '') {
            $errors['action_remark'] = ['Action remark wajib diisi saat status Done.'];
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function createCompletedMaintenanceCondition(TransMaintenance $maintenance, string $username): void
    {
        TransCondition::create([
            'reg_id' => $maintenance->reg_id,
            'date' => $maintenance->selesai ?? now()->toDateString(),
            'kondisi' => $maintenance->kondisi,
            'remarks' => "Maintenance #{$maintenance->id} selesai: {$maintenance->action_remark}",
            'create_by' => mb_substr($username, 0, 25),
            'create_date' => now(),
        ]);
    }
}
