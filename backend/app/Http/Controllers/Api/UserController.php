<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Spatie\Permission\Models\Role;
use App\Services\EstateRoleDefaults;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-users', only: ['index', 'show']),
            new Middleware('permission:create-users', only: ['store']),
            new Middleware('permission:edit-users', only: ['update']),
            new Middleware('permission:delete-users', only: ['destroy']),
        ];
    }

    public function index()
    {
        return response()->json([
            'data' => User::with(['role', 'assetDepartments', 'assetDivisions.department'])->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|unique:users',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'estate_id' => 'nullable|string',
            'role_id' => 'required|exists:roles,id',
            'not_active' => 'boolean',
            'asset_department_ids' => 'nullable|array',
            'asset_department_ids.*' => 'integer|exists:asset_departments,id',
            'asset_division_ids' => 'nullable|array',
            'asset_division_ids.*' => 'integer|exists:asset_divisions,id',
        ]);

        $isNotActive = $validated['not_active'] ?? false;
        $role = Role::findById($validated['role_id'], 'web');
        $estateRoleDefaults = app(EstateRoleDefaults::class);

        if ($estateRoleDefaults->isEstateRole($role)) {
            $estateRoleDefaults->ensurePermissions();

            if (!$isNotActive) {
                $estateRoleDefaults->assertSingleActiveEstateUser($validated['estate_id'] ?? null);
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'estate_id' => $validated['estate_id'],
            'role_id' => $validated['role_id'],
            'not_active' => $isNotActive,
            'guid' => 'local-' . Str::uuid()->toString(),
            'domain' => 'local',
        ]);

        $user->assignRole($role);
        $this->syncAssetOwnership($user, $validated);

        return response()->json(['message' => 'User created successfully', 'data' => $user->load(['role', 'assetDepartments', 'assetDivisions.department'])], 201);
    }

    public function show($id)
    {
        return response()->json(['data' => User::with(['role', 'assetDepartments', 'assetDivisions.department'])->findOrFail($id)]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|unique:users,username,' . $id,
            'email' => 'required|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'estate_id' => 'nullable|string',
            'role_id' => 'required|exists:roles,id',
            'not_active' => 'boolean',
            'asset_department_ids' => 'nullable|array',
            'asset_department_ids.*' => 'integer|exists:asset_departments,id',
            'asset_division_ids' => 'nullable|array',
            'asset_division_ids.*' => 'integer|exists:asset_divisions,id',
        ]);

        $isNotActive = $validated['not_active'] ?? $user->not_active;
        $role = Role::findById($validated['role_id'], 'web');
        $estateRoleDefaults = app(EstateRoleDefaults::class);

        if ($estateRoleDefaults->isEstateRole($role)) {
            $estateRoleDefaults->ensurePermissions();

            if (!$isNotActive) {
                $estateRoleDefaults->assertSingleActiveEstateUser($validated['estate_id'] ?? null, $user->id);
            }
        }

        $updateData = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'estate_id' => $validated['estate_id'],
            'role_id' => $validated['role_id'],
            'not_active' => $isNotActive,
            'access_setup_required' => false,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        // Sync role
        $user->syncRoles([$role]);
        $this->syncAssetOwnership($user, $validated);

        return response()->json(['message' => 'User updated successfully', 'data' => $user->load(['role', 'assetDepartments', 'assetDivisions.department'])]);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    private function syncAssetOwnership(User $user, array $validated): void
    {
        $user->assetDepartments()->sync($validated['asset_department_ids'] ?? []);
        $user->assetDivisions()->sync($validated['asset_division_ids'] ?? []);
    }
}
