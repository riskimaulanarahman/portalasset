<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetDepartment;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssetDepartmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-asset-departments', only: ['index', 'show']),
            new Middleware('permission:create-asset-departments', only: ['store']),
            new Middleware('permission:edit-asset-departments', only: ['update']),
            new Middleware('permission:delete-asset-departments', only: ['destroy']),
        ];
    }

    public function index()
    {
        return response()->json([
            'data' => AssetDepartment::with('divisions')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:30',
            'name' => 'required|string|max:100|unique:asset_departments,name',
            'not_active' => 'boolean',
        ]);

        $department = AssetDepartment::create($validated);

        return response()->json(['message' => 'Asset department created successfully', 'data' => $department], 201);
    }

    public function show(AssetDepartment $assetDepartment)
    {
        return response()->json(['data' => $assetDepartment->load('divisions')]);
    }

    public function update(Request $request, AssetDepartment $assetDepartment)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:30',
            'name' => 'sometimes|required|string|max:100|unique:asset_departments,name,' . $assetDepartment->id,
            'not_active' => 'boolean',
        ]);

        $assetDepartment->update($validated);

        return response()->json(['message' => 'Asset department updated successfully', 'data' => $assetDepartment]);
    }

    public function destroy(AssetDepartment $assetDepartment)
    {
        if ($assetDepartment->assets()->exists() || $assetDepartment->divisions()->exists()) {
            return response()->json(['message' => 'Cannot delete department that is in use.'], 422);
        }

        $assetDepartment->delete();

        return response()->json(['message' => 'Asset department deleted successfully']);
    }
}
