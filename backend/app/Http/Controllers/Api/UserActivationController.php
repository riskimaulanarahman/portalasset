<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;
use App\Services\EstateRoleDefaults;
use Spatie\Permission\Models\Role;

class UserActivationController extends Controller implements HasMiddleware
{
    private const ACTIVATION_ROLES = ['guest', 'estate', 'manager', 'finance'];

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-user-activations', only: ['index']),
            new Middleware('permission:edit-user-activations', only: ['activate', 'deactivate']),
        ];
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,active,all',
        ]);

        $status = $validated['status'] ?? 'pending';

        $query = User::with(['role', 'estate', 'assetDepartments', 'assetDivisions.department'])
            ->whereDoesntHave('roles', fn ($roleQuery) => $roleQuery->where('name', 'admin'))
            ->where(function ($domainQuery) {
                $domainQuery->whereNull('domain')
                    ->orWhereNotIn('domain', ['seed', 'local']);
            })
            ->orderByDesc('not_active')
            ->orderBy('name');

        if ($status === 'pending') {
            $query->where('not_active', true);
        } elseif ($status === 'active') {
            $query->where('not_active', false);
        }

        $users = $query->get();
        $employees = Anggota::whereIn('login_name', $users->pluck('username')->filter()->values())
            ->get()
            ->keyBy('login_name');

        return response()->json([
            'data' => $users->map(function (User $user) use ($employees) {
                $employee = $employees->get($user->username);

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'domain' => $user->domain,
                    'not_active' => $user->not_active,
                    'role_id' => $user->role_id,
                    'role' => $user->role,
                    'estate_id' => $user->estate_id,
                    'estate' => $user->estate,
                    'asset_departments' => $user->assetDepartments,
                    'asset_divisions' => $user->assetDivisions,
                    'employee' => $employee ? [
                        'sap_id' => $employee->sap_id,
                        'nama' => $employee->nama,
                        'department' => $employee->department,
                        'cost_center' => $employee->cost_center,
                        'company_code' => $employee->company_code,
                    ] : null,
                ];
            })->values(),
            'roles' => $this->activationRoles(),
        ]);
    }

    public function activate(Request $request, User $user)
    {
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
        ]);

        $role = Role::where('guard_name', 'web')->whereKey($validated['role_id'])->firstOrFail();

        if (! in_array(strtolower($role->name), self::ACTIVATION_ROLES, true)) {
            throw ValidationException::withMessages([
                'role_id' => ['Role tidak tersedia untuk aktivasi user.'],
            ]);
        }

        $estateRoleDefaults = app(EstateRoleDefaults::class);
        if ($estateRoleDefaults->isEstateRole($role)) {
            $estateRoleDefaults->ensurePermissions();

            if ($user->estate_id) {
                $estateRoleDefaults->assertSingleActiveEstateUser($user->estate_id, $user->id);
            }
        }

        $user->forceFill([
            'role_id' => $role->id,
            'not_active' => false,
            'access_setup_required' => false,
        ])->save();

        $user->syncRoles([$role]);

        return response()->json([
            'message' => 'User berhasil diaktivasi.',
            'data' => $user->fresh(['role', 'estate']),
        ]);
    }

    public function deactivate(Request $request, User $user)
    {
        $user->forceFill([
            'not_active' => true,
            'role_id' => null,
            'access_setup_required' => false,
        ])->save();

        $user->syncRoles([]);

        return response()->json([
            'message' => 'User berhasil dinonaktifkan.',
            'data' => $user->fresh(['role', 'estate']),
        ]);
    }

    private function activationRoles()
    {
        return Role::where('guard_name', 'web')
            ->get()
            ->filter(fn (Role $role) => in_array(strtolower($role->name), self::ACTIVATION_ROLES, true))
            ->sortBy(fn (Role $role) => array_search(strtolower($role->name), self::ACTIVATION_ROLES, true))
            ->values();
    }
}
