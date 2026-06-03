<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessUnit;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class BusinessUnitController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-business-units', only: ['index', 'show']),
            new Middleware('permission:create-business-units', only: ['store']),
            new Middleware('permission:edit-business-units', only: ['update']),
            new Middleware('permission:delete-business-units', only: ['destroy']),
        ];
    }

    public function index()
    {
        return response()->json(['data' => BusinessUnit::orderBy('bu_code')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bu_code' => 'required|max:20|unique:business_units,bu_code',
            'bu_name' => 'required|max:100',
        ]);

        $businessUnit = BusinessUnit::create($validated);
        return response()->json(['message' => 'Business unit created successfully', 'data' => $businessUnit], 201);
    }

    public function show(BusinessUnit $businessUnit)
    {
        return response()->json(['data' => $businessUnit]);
    }

    public function update(Request $request, BusinessUnit $businessUnit)
    {
        $validated = $request->validate([
            'bu_code' => 'sometimes|required|max:20|unique:business_units,bu_code,' . $businessUnit->id,
            'bu_name' => 'sometimes|required|max:100',
        ]);

        $businessUnit->update($validated);
        return response()->json(['message' => 'Business unit updated successfully', 'data' => $businessUnit]);
    }

    public function destroy(BusinessUnit $businessUnit)
    {
        if ($businessUnit->estates()->count() > 0) {
            return response()->json(['message' => 'Cannot delete business unit that has estates'], 422);
        }

        $businessUnit->delete();
        return response()->json(['message' => 'Business unit deleted successfully']);
    }
}
