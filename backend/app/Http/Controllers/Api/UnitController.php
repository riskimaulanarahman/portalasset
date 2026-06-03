<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UnitController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-units', only: ['index', 'show']),
            new Middleware('permission:create-units', only: ['store']),
            new Middleware('permission:edit-units', only: ['update']),
            new Middleware('permission:delete-units', only: ['destroy']),
        ];
    }

    public function index()
    {
        return response()->json(['data' => Unit::orderBy('nama', 'asc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|max:50|unique:units,nama',
            'keterangan' => 'nullable|max:150',
        ]);

        $unit = Unit::create($validated);
        return response()->json(['message' => 'Unit created successfully', 'data' => $unit], 201);
    }

    public function show(Unit $unit)
    {
        return response()->json(['data' => $unit]);
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'nama' => 'sometimes|required|max:50|unique:units,nama,' . $unit->id,
            'keterangan' => 'nullable|max:150',
        ]);

        $unit->update($validated);
        return response()->json(['message' => 'Unit updated successfully', 'data' => $unit]);
    }

    public function destroy(Unit $unit)
    {
        if ($unit->materials()->count() > 0) {
            return response()->json(['message' => 'Cannot delete unit that is in use by materials'], 422);
        }

        $unit->delete();
        return response()->json(['message' => 'Unit deleted successfully']);
    }
}
