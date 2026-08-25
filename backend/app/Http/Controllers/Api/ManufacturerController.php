<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ManufacturerController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-manufacturers', only: ['index', 'show']),
            new Middleware('permission:create-manufacturers', only: ['store']),
            new Middleware('permission:edit-manufacturers', only: ['update']),
            new Middleware('permission:delete-manufacturers', only: ['destroy']),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(['data' => Manufacturer::all()]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:manufacturers,name',
        ]);

        $manufacturer = Manufacturer::create([
            'name' => $validated['name'],
            'create_by' => auth()->user() ? auth()->user()->username : 'system',
        ]);

        return response()->json([
            'message' => 'Manufacturer created successfully',
            'data' => $manufacturer
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Manufacturer $manufacturer)
    {
        return response()->json(['data' => $manufacturer]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Manufacturer $manufacturer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:manufacturers,name,' . $manufacturer->id,
        ]);

        $manufacturer->update([
            'name' => $validated['name'],
            'update_by' => auth()->user() ? auth()->user()->username : 'system',
        ]);

        return response()->json([
            'message' => 'Manufacturer updated successfully',
            'data' => $manufacturer
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Manufacturer $manufacturer)
    {
        $manufacturer->delete();
        return response()->json(['message' => 'Manufacturer deleted successfully']);
    }
}
