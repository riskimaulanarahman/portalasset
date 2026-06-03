<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Estate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssetController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-assets', only: ['index', 'show']),
            new Middleware('permission:create-assets', only: ['store']),
            new Middleware('permission:edit-assets', only: ['update']),
            new Middleware('permission:delete-assets', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = Asset::with(['section', 'assetReg', 'vendor', 'estate']);
        $estateId = $this->isHeadOfficeUser()
            ? ($request->filled('estate_id') ? (int) $request->estate_id : null)
            : $this->currentEstateId();

        if ($estateId) {
            $estate = Estate::find($estateId);

            $query->where(function ($q) use ($estateId, $estate) {
                $q->where('estate_id', $estateId);

                if ($estate) {
                    $q->orWhere(function ($legacy) use ($estate) {
                        $legacy->whereNull('estate_id')
                            ->where('unit_id', $estate->estate_id);
                    });
                }
            });
        }

        if ($request->has('section_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('section_id', $request->section_id);
            });
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
            'reg_id' => 'required|max:10|unique:assets',
            'asset_no' => 'nullable|max:25',
            'unit_id' => 'nullable|max:25',
            'date' => 'nullable|date',
            'serial_no' => 'nullable',
            'type_id' => 'required|exists:asset_regs,id',
            'type' => 'required|max:25',
            'manufacture' => 'required|max:50',
            'series' => 'required|max:25',
            'section_id' => 'required|exists:sections,id',
            'alokasi' => 'nullable|max:10',
            'keterangan' => 'nullable',
            'vendor_id' => 'nullable|exists:vendors,id',
            'estate_id' => 'required|exists:estates,id',
            'source' => 'nullable|max:20',
        ]);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $validated['create_by'] = Auth::user()->username ?? 'system';

        $asset = Asset::create($validated);
        return response()->json(['message' => 'Asset created successfully', 'data' => $asset], 201);
    }

    public function show(Asset $asset)
    {
        $this->ensureAssetAccess($asset);

        return response()->json(['data' => $asset->load(['section', 'assetReg', 'transactions', 'maintenances', 'vendor', 'estate'])]);
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
            'section_id' => 'sometimes|required|exists:sections,id',
            'alokasi' => 'nullable|max:10',
            'keterangan' => 'nullable',
            'vendor_id' => 'nullable|exists:vendors,id',
            'estate_id' => 'sometimes|required|exists:estates,id',
            'not_active' => 'boolean',
        ]);

        $this->ensureAssetAccess($asset);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $validated['update_by'] = Auth::user()->username ?? 'system';

        $asset->update($validated);
        return response()->json(['message' => 'Asset updated successfully', 'data' => $asset]);
    }

    public function destroy(Asset $asset)
    {
        $this->ensureAssetAccess($asset);

        $asset->delete();
        return response()->json(['message' => 'Asset deleted successfully']);
    }

    private function ensureAssetAccess(Asset $asset): void
    {
        if ($this->isHeadOfficeUser()) {
            return;
        }

        $owned = (int) $asset->estate_id === $this->currentEstateId()
            || ($asset->estate_id === null && $asset->unit_id === $this->currentEstateCode());

        abort_unless($owned, 404);
    }
}
