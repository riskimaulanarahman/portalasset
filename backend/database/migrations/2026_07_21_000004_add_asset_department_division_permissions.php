<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guardName = 'web';
        $permissions = [
            'view-asset-departments',
            'create-asset-departments',
            'edit-asset-departments',
            'delete-asset-departments',
            'view-asset-divisions',
            'create-asset-divisions',
            'edit-asset-divisions',
            'delete-asset-divisions',
        ];

        foreach ($permissions as $permissionName) {
            if (!DB::table('permissions')->where('name', $permissionName)->where('guard_name', $guardName)->exists()) {
                DB::table('permissions')->insert([
                    'name' => $permissionName,
                    'guard_name' => $guardName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $adminRole = DB::table('roles')->where('name', 'admin')->where('guard_name', $guardName)->first();
        if (!$adminRole) {
            return;
        }

        foreach ($permissions as $permissionName) {
            $permission = DB::table('permissions')->where('name', $permissionName)->where('guard_name', $guardName)->first();
            if (!$permission) {
                continue;
            }

            if (!DB::table('role_has_permissions')->where('role_id', $adminRole->id)->where('permission_id', $permission->id)->exists()) {
                DB::table('role_has_permissions')->insert([
                    'role_id' => $adminRole->id,
                    'permission_id' => $permission->id,
                ]);
            }
        }
    }

    public function down(): void
    {
        $permissions = [
            'view-asset-departments',
            'create-asset-departments',
            'edit-asset-departments',
            'delete-asset-departments',
            'view-asset-divisions',
            'create-asset-divisions',
            'edit-asset-divisions',
            'delete-asset-divisions',
        ];

        $permissionIds = DB::table('permissions')->whereIn('name', $permissions)->where('guard_name', 'web')->pluck('id');

        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
