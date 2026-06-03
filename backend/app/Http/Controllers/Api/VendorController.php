<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class VendorController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-vendors', only: ['index', 'show']),
            new Middleware('permission:create-vendors', only: ['store']),
            new Middleware('permission:edit-vendors', only: ['update']),
            new Middleware('permission:delete-vendors', only: ['destroy']),
        ];
    }

    public function index()
    {
        return response()->json(['data' => Vendor::orderBy('nama', 'asc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|max:150|unique:vendors,nama',
            'alamat' => 'nullable',
            'telepon' => 'nullable|max:20',
            'email' => 'nullable|email|max:100',
            'pic' => 'nullable|max:100',
        ]);

        $vendor = Vendor::create($validated);
        return response()->json(['message' => 'Vendor created successfully', 'data' => $vendor], 201);
    }

    public function show(Vendor $vendor)
    {
        return response()->json(['data' => $vendor]);
    }

    public function update(Request $request, Vendor $vendor)
    {
        $validated = $request->validate([
            'nama' => 'sometimes|required|max:150|unique:vendors,nama,' . $vendor->id,
            'alamat' => 'nullable',
            'telepon' => 'nullable|max:20',
            'email' => 'nullable|email|max:100',
            'pic' => 'nullable|max:100',
        ]);

        $vendor->update($validated);
        return response()->json(['message' => 'Vendor updated successfully', 'data' => $vendor]);
    }

    public function destroy(Vendor $vendor)
    {
        // Check if vendor is in use
        if ($vendor->assets()->count() > 0 || $vendor->software()->count() > 0) {
            return response()->json(['message' => 'Cannot delete vendor that is in use by assets or software'], 422);
        }

        $vendor->delete();
        return response()->json(['message' => 'Vendor deleted successfully']);
    }
}
