<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guardName = 'web';

        $permissionsToAdd = [
            'view-estates',
            'view-materials',
            'create-materials',
            'edit-materials',
            'create-anggotas',
            'edit-anggotas',
            'delete-anggotas',
        ];

        $roleNames = ['estate', 'Manager', 'Finance'];

        foreach ($roleNames as $roleName) {
            $role = DB::table('roles')
                ->where('name', $roleName)
                ->where('guard_name', $guardName)
                ->first();

            if (!$role) {
                continue;
            }

            foreach ($permissionsToAdd as $permName) {
                $permission = DB::table('permissions')
                    ->where('name', $permName)
                    ->where('guard_name', $guardName)
                    ->first();

                if (!$permission) {
                    continue;
                }

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
            'create-materials',
            'edit-materials',
            'create-anggotas',
            'edit-anggotas',
            'delete-anggotas',
        ];

        $roleNames = ['estate', 'Manager', 'Finance'];

        foreach ($roleNames as $roleName) {
            $role = DB::table('roles')
                ->where('name', $roleName)
                ->where('guard_name', $guardName)
                ->first();

            if (!$role) {
                continue;
            }

            foreach ($permissionsToRemove as $permName) {
                $permission = DB::table('permissions')
                    ->where('name', $permName)
                    ->where('guard_name', $guardName)
                    ->first();

                if (!$permission) {
                    continue;
                }

                DB::table('role_has_permissions')
                    ->where('role_id', $role->id)
                    ->where('permission_id', $permission->id)
                    ->delete();
            }
        }
    }
};
