<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estate;
use App\Services\EstateRoleDefaults;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProfileEstateController extends Controller
{
    public function options(Request $request)
    {
        $user = $request->user();

        abort_if($user->not_active, 403, 'Akun anda belum diaktivasi oleh admin.');

        $query = Estate::orderBy('estate_id');
        $estateRoleDefaults = app(EstateRoleDefaults::class);

        if ($estateRoleDefaults->isEstateRole($user->role)) {
            $occupiedEstateIds = $estateRoleDefaults->occupiedActiveEstateIds($user->id);

            if (!empty($occupiedEstateIds)) {
                $query->whereNotIn('id', $occupiedEstateIds);
            }
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        abort_if($user->not_active, 403, 'Akun anda belum diaktivasi oleh admin.');

        if ($user->estate_id) {
            throw ValidationException::withMessages([
                'estate_id' => ['Estate sudah dipilih. Hubungi admin untuk perubahan estate.'],
            ]);
        }

        $validated = $request->validate([
            'estate_id' => 'required|exists:estates,id',
        ]);

        $estateRoleDefaults = app(EstateRoleDefaults::class);
        if ($estateRoleDefaults->isEstateRole($user->role)) {
            $estateRoleDefaults->ensurePermissions();
            $estateRoleDefaults->assertSingleActiveEstateUser($validated['estate_id'], $user->id);
        }

        $user->forceFill([
            'estate_id' => $validated['estate_id'],
            'access_setup_required' => false,
        ])->save();

        $user = $user->fresh(['role', 'estate', 'assetDepartments', 'assetDivisions.department']);

        return response()->json([
            'message' => 'Estate berhasil dipilih.',
            'user' => $user,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ]);
    }
}
