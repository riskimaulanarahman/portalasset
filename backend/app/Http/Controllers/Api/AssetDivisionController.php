<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetDivision;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class AssetDivisionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-asset-divisions', only: ['index', 'show']),
            new Middleware('permission:create-asset-divisions', only: ['store']),
            new Middleware('permission:edit-asset-divisions', only: ['update']),
            new Middleware('permission:delete-asset-divisions', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = AssetDivision::with('department')->orderBy('name');

        if ($request->filled('asset_department_id')) {
            $query->where('asset_department_id', $request->integer('asset_department_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_department_id' => 'required|exists:asset_departments,id',
            'code' => 'nullable|string|max:30',
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('asset_divisions', 'name')
                    ->where('asset_department_id', $request->input('asset_department_id')),
            ],
            'not_active' => 'boolean',
        ]);

        $division = AssetDivision::create($validated);

        return response()->json(['message' => 'Asset division created successfully', 'data' => $division->load('department')], 201);
    }

    public function show(AssetDivision $assetDivision)
    {
        return response()->json(['data' => $assetDivision->load('department')]);
    }

    public function update(Request $request, AssetDivision $assetDivision)
    {
        $departmentId = $request->input('asset_department_id', $assetDivision->asset_department_id);

        $validated = $request->validate([
            'asset_department_id' => 'sometimes|required|exists:asset_departments,id',
            'code' => 'nullable|string|max:30',
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('asset_divisions', 'name')
                    ->where('asset_department_id', $departmentId)
                    ->ignore($assetDivision->id),
            ],
            'not_active' => 'boolean',
        ]);

        $assetDivision->update($validated);

        return response()->json(['message' => 'Asset division updated successfully', 'data' => $assetDivision->load('department')]);
    }

    public function destroy(AssetDivision $assetDivision)
    {
        if ($assetDivision->assets()->exists()) {
            return response()->json(['message' => 'Cannot delete division that is in use.'], 422);
        }

        $assetDivision->delete();

        return response()->json(['message' => 'Asset division deleted successfully']);
    }
}
