<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Spatie\Permission\Models\Role;

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
            'data' => User::with('role')->get()
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
        ]);

        $isNotActive = $validated['not_active'] ?? false;

        if (!$isNotActive) {
            $exists = User::where('estate_id', $validated['estate_id'])
                ->where('role_id', $validated['role_id'])
                ->where('not_active', false)
                ->exists();
            
            if ($exists) {
                return response()->json([
                    'message' => 'An active user with this role already exists in this estate. Please deactivate the existing user first.'
                ], 422);
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
        ]);

        $role = Role::findById($validated['role_id'], 'web');
        $user->assignRole($role);

        return response()->json(['message' => 'User created successfully', 'data' => $user->load('role')], 201);
    }

    public function show($id)
    {
        return response()->json(['data' => User::with('role')->findOrFail($id)]);
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
        ]);

        $isNotActive = $validated['not_active'] ?? $user->not_active;

        if (!$isNotActive) {
            $exists = User::where('estate_id', $validated['estate_id'])
                ->where('role_id', $validated['role_id'])
                ->where('not_active', false)
                ->where('id', '!=', $id)
                ->exists();
            
            if ($exists) {
                return response()->json([
                    'message' => 'An active user with this role already exists in this estate. Please deactivate the existing user first.'
                ], 422);
            }
        }

        $updateData = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'estate_id' => $validated['estate_id'],
            'role_id' => $validated['role_id'],
            'not_active' => $isNotActive,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        // Sync role
        $role = Role::findById($validated['role_id'], 'web');
        $user->syncRoles([$role]);

        return response()->json(['message' => 'User updated successfully', 'data' => $user->load('role')]);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
