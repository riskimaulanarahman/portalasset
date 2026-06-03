<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guardName = 'web';

        // Create new permissions
        $newPermissions = [
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
        ];

        foreach ($newPermissions as $permName) {
            $exists = DB::table('permissions')
                ->where('name', $permName)
                ->where('guard_name', $guardName)
                ->exists();

            if (!$exists) {
                DB::table('permissions')->insert([
                    'name'       => $permName,
                    'guard_name' => $guardName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Assign permissions per role
        $rolePermissions = [
            'admin' => $newPermissions,
            'estate' => [
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
            ],
            'Manager' => [
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
            ],
            'Finance' => [
                'view-asset-conditions',
                'view-asset-maintenances',
                'view-write-offs',
            ],
        ];

        foreach ($rolePermissions as $roleName => $permissions) {
            $role = DB::table('roles')
                ->where('name', $roleName)
                ->where('guard_name', $guardName)
                ->first();

            if (!$role) continue;

            foreach ($permissions as $permName) {
                $permission = DB::table('permissions')
                    ->where('name', $permName)
                    ->where('guard_name', $guardName)
                    ->first();

                if (!$permission) continue;

                $exists = DB::table('role_has_permissions')
                    ->where('role_id', $role->id)
                    ->where('permission_id', $permission->id)
                    ->exists();

                if (!$exists) {
                    DB::table('role_has_permissions')->insert([
                        'role_id'       => $role->id,
                        'permission_id' => $permission->id,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        $guardName = 'web';

        $permissionsToRemove = [
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
        ];

        $permissionIds = DB::table('permissions')
            ->whereIn('name', $permissionsToRemove)
            ->where('guard_name', $guardName)
            ->pluck('id');

        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
