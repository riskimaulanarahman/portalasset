<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetType;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssetTypeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-asset-types', only: ['index', 'show']),
            new Middleware('permission:create-asset-types', only: ['store']),
            new Middleware('permission:edit-asset-types', only: ['update']),
            new Middleware('permission:delete-asset-types', only: ['destroy']),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(['data' => AssetType::all()]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:25|unique:asset_types,name',
        ]);

        $assetType = AssetType::create([
            'name' => $validated['name'],
            'create_by' => auth()->user() ? auth()->user()->username : 'system',
        ]);

        return response()->json([
            'message' => 'Asset type created successfully',
            'data' => $assetType
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(AssetType $assetType)
    {
        return response()->json(['data' => $assetType]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AssetType $assetType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:25|unique:asset_types,name,' . $assetType->id,
        ]);

        $assetType->update([
            'name' => $validated['name'],
            'update_by' => auth()->user() ? auth()->user()->username : 'system',
        ]);

        return response()->json([
            'message' => 'Asset type updated successfully',
            'data' => $assetType
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AssetType $assetType)
    {
        $assetType->delete();
        return response()->json(['message' => 'Asset type deleted successfully']);
    }
}
