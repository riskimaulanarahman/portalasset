<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\InteractsWithEstateScope;
use App\Http\Controllers\Controller;
use App\Models\Software;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SoftwareController extends Controller implements HasMiddleware
{
    use InteractsWithEstateScope;

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-software', only: ['index', 'show']),
            new Middleware('permission:create-software', only: ['store']),
            new Middleware('permission:edit-software', only: ['update']),
            new Middleware('permission:delete-software', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        // #19 FIX: Load relasi asset agar frontend dapat menampilkan nama host asset
        $query = Software::with(['vendor', 'estate', 'asset']);
        $estateId = $this->isHeadOfficeUser()
            ? ($request->filled('estate_id') ? (int) $request->estate_id : null)
            : $this->currentEstateId();

        if ($estateId) {
            $query->where('estate_id', $estateId);
        }

        $software = $query->get();
        return response()->json(['data' => $software]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|max:50',
            'vendor_id'   => 'nullable|exists:vendors,id',
            'estate_id'   => 'required|exists:estates,id',
            'asset_id'    => 'nullable|exists:assets,reg_id',  // #19 FIX
            'license_key' => 'nullable|max:50',
            'expiry_date' => 'nullable|date',
            'status'      => 'nullable|max:20',
        ]);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $software = Software::create($validated);
        return response()->json(['message' => 'Software created successfully', 'data' => $software], 201);
    }

    public function show(Software $software)
    {
        $this->ensureEstateAccess($software->estate_id);

        return response()->json(['data' => $software->load(['vendor', 'estate', 'asset'])]);
    }

    public function update(Request $request, Software $software)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|max:50',
            'vendor_id'   => 'nullable|exists:vendors,id',
            'estate_id'   => 'sometimes|required|exists:estates,id',
            'asset_id'    => 'nullable|exists:assets,reg_id',  // #19 FIX
            'license_key' => 'nullable|max:50',
            'expiry_date' => 'nullable|date',
            'status'      => 'nullable|max:20',
        ]);

        $this->ensureEstateAccess($software->estate_id);

        if (!$this->isHeadOfficeUser()) {
            $validated['estate_id'] = $this->currentEstateId();
        }

        $software->update($validated);
        return response()->json(['message' => 'Software updated successfully', 'data' => $software]);
    }

    public function destroy(Software $software)
    {
        $this->ensureEstateAccess($software->estate_id);

        $software->delete();
        return response()->json(['message' => 'Software deleted successfully']);
    }
}
