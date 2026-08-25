<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Spatie\Permission\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class RoleController extends Controller implements HasMiddleware
{
    private const PROTECTED_ROLES = ['admin', 'estate', 'manager', 'guest'];

    public static function middleware(): array
    {
        return [
            new Middleware('permission:view-roles', only: ['index']),
            new Middleware('permission:create-roles', only: ['store']),
            new Middleware('permission:edit-roles', only: ['update']),
            new Middleware('permission:delete-roles', only: ['destroy']),
        ];
    }

    /**
     * Display a listing of the roles.
     */
    public function index()
    {
        return response()->json([
            'data' => Role::all()
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web'
        ]);

        return response()->json([
            'message' => 'Role created successfully',
            'data' => $role
        ]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, Role $role)
    {
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            return response()->json(['message' => 'Cannot modify built-in system roles'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name,' . $role->id,
        ]);

        $role->update(['name' => $validated['name']]);

        return response()->json([
            'message' => 'Role updated successfully',
            'data' => $role
        ]);
    }

    /**
     * Remove the specified role.
     */
    public function destroy(Role $role)
    {
        if (in_array($role->name, self::PROTECTED_ROLES, true)) {
            return response()->json(['message' => 'Cannot delete built-in system roles'], 403);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }
}
