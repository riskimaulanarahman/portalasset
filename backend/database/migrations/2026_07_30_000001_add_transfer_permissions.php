<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';
        $permissions = [
            'view-transfers',
            'create-transfers',
            'edit-transfers',
            'delete-transfers',
            'cancel-transfers',
            'download-transfer-ba',
            'view-transfer-history',
            'assign-asset-members',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, $guard);
        }

        Role::findOrCreate('admin', $guard)->givePermissionTo($permissions);

        $operationalPermissions = [
            'view-transfers',
            'create-transfers',
            'cancel-transfers',
            'download-transfer-ba',
            'view-transfer-history',
            'assign-asset-members',
        ];

        foreach (['estate', 'manager', 'finance'] as $roleName) {
            Role::findOrCreate($roleName, $guard)->givePermissionTo($operationalPermissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';
        $permissions = [
            'view-transfers',
            'create-transfers',
            'edit-transfers',
            'delete-transfers',
            'cancel-transfers',
            'download-transfer-ba',
            'view-transfer-history',
            'assign-asset-members',
        ];

        foreach (['estate', 'manager', 'finance', 'admin'] as $roleName) {
            $role = Role::where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->revokePermissionTo($permissions);
            }
        }

        foreach ($permissions as $permission) {
            Permission::where('name', $permission)->where('guard_name', $guard)->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
