<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\TransMaintenance;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class TransMaintenanceController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

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
        } else {
            if (!$this->isHeadOfficeUser()) {
                $estateId = $this->currentEstateId();
                $query->whereHas('asset', fn($q) => $q->where('estate_id', $estateId));
            } elseif ($request->filled('estate_id')) {
                $query->whereHas('asset', fn($q) => $q->where('estate_id', $request->estate_id));
            }
        }

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
            'kondisi'       => 'required|max:25',
            'keterangan'    => 'nullable|string',
            'action_remark' => 'nullable|string',
            'attachment'    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'status'        => 'nullable|in:Progress,Done',
            'validasi'      => 'nullable|boolean',
        ]);

        if (!$this->isHeadOfficeUser()) {
            $asset = Asset::findOrFail($validated['reg_id']);
            abort_unless((int) $asset->estate_id === $this->currentEstateId(), 403, 'Akses ditolak untuk aset estate lain.');
        }

        if ($request->hasFile('attachment')) {
            $validated['attachment'] = $request->file('attachment')->store('maintenances', 'public');
        }

        $username = Auth::user()->username ?? Auth::user()->name ?? 'system';

        $maintenance = TransMaintenance::create(array_merge($validated, [
            'create_by'   => $username,
            'create_date' => now(),
            'status'      => $validated['status'] ?? 'Progress',
        ]));

        return response()->json(['message' => 'Maintenance berhasil dibuat', 'data' => $maintenance->load('asset')], 201);
    }

    public function show(TransMaintenance $assetMaintenance)
    {
        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $assetMaintenance->asset->estate_id === $this->currentEstateId(), 404);
        }

        return response()->json(['data' => $assetMaintenance->load('asset.section', 'asset.estate')]);
    }

    public function update(Request $request, TransMaintenance $assetMaintenance)
    {
        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $assetMaintenance->asset->estate_id === $this->currentEstateId(), 403);
        }

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
            'kondisi'       => 'sometimes|max:25',
            'keterangan'    => 'nullable|string',
            'action_remark' => 'nullable|string',
            'attachment'    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'status'        => 'nullable|in:Progress,Done',
            'validasi'      => 'nullable|boolean',
        ]);

        if ($request->hasFile('attachment')) {
            if ($assetMaintenance->attachment) {
                Storage::disk('public')->delete($assetMaintenance->attachment);
            }
            $validated['attachment'] = $request->file('attachment')->store('maintenances', 'public');
        }

        $validated['update_by']   = Auth::user()->username ?? Auth::user()->name ?? 'system';
        $validated['update_date'] = now();

        $assetMaintenance->update($validated);

        return response()->json(['message' => 'Maintenance berhasil diperbarui', 'data' => $assetMaintenance]);
    }

    public function destroy(TransMaintenance $assetMaintenance)
    {
        if (!$this->isHeadOfficeUser()) {
            abort_unless((int) $assetMaintenance->asset->estate_id === $this->currentEstateId(), 403);
        }

        if ($assetMaintenance->attachment) {
            Storage::disk('public')->delete($assetMaintenance->attachment);
        }

        $assetMaintenance->delete();

        return response()->json(['message' => 'Maintenance berhasil dihapus']);
    }
}
