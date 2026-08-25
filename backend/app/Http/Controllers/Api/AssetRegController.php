<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetReg;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssetRegController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-asset-regs', only: ['index', 'show']),
            new Middleware('permission:create-asset-regs', only: ['store']),
            new Middleware('permission:edit-asset-regs', only: ['update']),
            new Middleware('permission:delete-asset-regs', only: ['destroy']),
        ];
    }
    public function index()
    {
        $regs = AssetReg::with(['section', 'manufacturer', 'assetType'])->get();
        return response()->json(['data' => $regs]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_type_id' => 'required|exists:asset_types,id',
            'manufacturer_id' => 'required|exists:manufacturers,id',
            'series' => 'nullable|max:25',
            'matcode' => 'nullable|max:25',
            'description' => 'nullable',
            'section_id' => 'required|exists:sections,id',
            'not_active' => 'boolean',
        ]);

        $validated['create_by'] = Auth::user()->username ?? 'system';

        $assetReg = AssetReg::create($validated);
        return response()->json(['message' => 'Asset Registration created successfully', 'data' => $assetReg], 201);
    }

    public function show(AssetReg $assetReg)
    {
        return response()->json(['data' => $assetReg->load(['section', 'manufacturer', 'assetType'])]);
    }

    public function update(Request $request, AssetReg $assetReg)
    {
        $validated = $request->validate([
            'asset_type_id' => 'sometimes|required|exists:asset_types,id',
            'manufacturer_id' => 'sometimes|required|exists:manufacturers,id',
            'series' => 'nullable|max:25',
            'matcode' => 'nullable|max:25',
            'description' => 'nullable',
            'section_id' => 'sometimes|required|exists:sections,id',
            'not_active' => 'boolean',
        ]);

        $validated['update_by'] = Auth::user()->username ?? 'system';

        $assetReg->update($validated);
        return response()->json(['message' => 'Asset Registration updated successfully', 'data' => $assetReg]);
    }

    public function destroy(AssetReg $assetReg)
    {
        $assetReg->delete();
        return response()->json(['message' => 'Asset Registration deleted successfully']);
    }
}
