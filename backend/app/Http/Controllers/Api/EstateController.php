<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Estate;
use Illuminate\Http\Request;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class EstateController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-estates', only: ['index', 'show']),
            new Middleware('permission:create-estates', only: ['store']),
            new Middleware('permission:edit-estates', only: ['update']),
            new Middleware('permission:delete-estates', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        $query = Estate::with('businessUnit')->orderBy('estate_id');

        if (!$this->isHeadOfficeUser()) {
            $estateId = $this->currentEstateId();

            // User dengan estate_id null (misal admin tanpa estate) → tampilkan semua
            if ($estateId !== null) {
                $businessUnitId = $this->currentBusinessUnitId();

                if ($businessUnitId) {
                    $query->where('business_unit_id', $businessUnitId);
                } else {
                    $query->whereKey($estateId);
                }

                if ($request->input('context') === 'transfer-destination') {
                    $query->whereKeyNot($estateId);
                }
            }
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'estate_id'       => 'required|max:3|unique:estates',
            'estate'          => 'required|max:30',
            'business_unit_id'=> 'nullable|exists:business_units,id',
            'region'          => 'nullable|max:30',
        ]);

        $estate = Estate::create($validated);
        return response()->json(['message' => 'Estate created successfully', 'data' => $estate->load('businessUnit')], 201);
    }

    public function show(Estate $estate)
    {
        $this->ensureEstateAccess($estate->id);

        return response()->json(['data' => $estate->load('businessUnit')]);
    }

    public function update(Request $request, Estate $estate)
    {
        $validated = $request->validate([
            'estate_id'       => 'sometimes|required|max:3|unique:estates,estate_id,' . $estate->id,
            'estate'          => 'sometimes|required|max:30',
            'business_unit_id'=> 'nullable|exists:business_units,id',
            'region'          => 'nullable|max:30',
        ]);

        $estate->update($validated);
        return response()->json(['message' => 'Estate updated successfully', 'data' => $estate->load('businessUnit')]);
    }

    public function destroy(Estate $estate)
    {
        $estate->delete();
        return response()->json(['message' => 'Estate deleted successfully']);
    }
}
