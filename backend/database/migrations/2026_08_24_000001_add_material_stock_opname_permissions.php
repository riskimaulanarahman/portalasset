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
            'view-material-stock-opnames',
            'create-material-stock-opnames',
            'edit-material-stock-opnames',
            'count-material-stock-opnames',
            'review-material-stock-opnames',
            'submit-material-stock-opnames',
            'cancel-material-stock-opnames',
            'export-material-stock-opnames',
            'post-material-stock-opnames',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, $guard);
        }

        Role::findOrCreate('admin', $guard)->givePermissionTo($permissions);

        $estatePermissions = [
            'view-material-stock-opnames',
            'create-material-stock-opnames',
            'edit-material-stock-opnames',
            'count-material-stock-opnames',
            'submit-material-stock-opnames',
            'cancel-material-stock-opnames',
            'export-material-stock-opnames',
        ];

        Role::findOrCreate('estate', $guard)->givePermissionTo($estatePermissions);
        Role::findOrCreate('manager', $guard)->givePermissionTo(array_merge($estatePermissions, [
            'review-material-stock-opnames',
        ]));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = 'web';
        $permissions = [
            'view-material-stock-opnames',
            'create-material-stock-opnames',
            'edit-material-stock-opnames',
            'count-material-stock-opnames',
            'review-material-stock-opnames',
            'submit-material-stock-opnames',
            'cancel-material-stock-opnames',
            'export-material-stock-opnames',
            'post-material-stock-opnames',
        ];

        foreach (['admin', 'estate', 'manager'] as $roleName) {
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
