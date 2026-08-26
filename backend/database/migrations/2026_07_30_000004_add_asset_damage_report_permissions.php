<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';
        $permissions = [
            'view-asset-reports',
            'create-asset-reports',
            'view-asset-conditions',
            'create-asset-conditions',
            'edit-asset-conditions',
            'delete-asset-conditions',
            'view-asset-maintenances',
            'create-asset-maintenances',
            'edit-asset-maintenances',
            'delete-asset-maintenances',
            'view-write-offs',
            'create-write-offs',
            'cancel-write-offs',
            'download-write-off-ba',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, $guard);
        }

        Role::findOrCreate('admin', $guard)->givePermissionTo($permissions);

        $operationalPermissions = [
            'view-asset-reports',
            'create-asset-reports',
            'view-asset-conditions',
            'create-asset-conditions',
            'view-asset-maintenances',
            'create-asset-maintenances',
            'edit-asset-maintenances',
            'view-write-offs',
            'create-write-offs',
            'cancel-write-offs',
            'download-write-off-ba',
        ];

        foreach (['estate', 'manager'] as $roleName) {
            Role::findOrCreate($roleName, $guard)->givePermissionTo($operationalPermissions);
        }

        Role::findOrCreate('finance', $guard)->givePermissionTo([
            'view-asset-reports',
            'view-asset-conditions',
            'view-asset-maintenances',
            'view-write-offs',
            'download-write-off-ba',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';
        $permissions = [
            'view-asset-reports',
            'create-asset-reports',
            'cancel-write-offs',
            'download-write-off-ba',
        ];

        foreach (['admin', 'estate', 'manager', 'finance'] as $roleName) {
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
