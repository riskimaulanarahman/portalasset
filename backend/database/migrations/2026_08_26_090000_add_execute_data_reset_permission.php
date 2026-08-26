<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guardName = 'web';
        $permissionName = 'execute-data-reset';

        $exists = DB::table('permissions')
            ->where('name', $permissionName)
            ->where('guard_name', $guardName)
            ->exists();

        if (!$exists) {
            DB::table('permissions')->insert([
                'name'       => $permissionName,
                'guard_name' => $guardName,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Hanya role admin yang boleh menjalankan reset data UAT
        $adminRole = DB::table('roles')
            ->where('name', 'admin')
            ->where('guard_name', $guardName)
            ->first();

        if ($adminRole) {
            $permission = DB::table('permissions')
                ->where('name', $permissionName)
                ->where('guard_name', $guardName)
                ->first();

            $alreadyAssigned = DB::table('role_has_permissions')
                ->where('role_id', $adminRole->id)
                ->where('permission_id', $permission->id)
                ->exists();

            if (!$alreadyAssigned) {
                DB::table('role_has_permissions')->insert([
                    'role_id'       => $adminRole->id,
                    'permission_id' => $permission->id,
                ]);
            }
        }
    }

    public function down(): void
    {
        $guardName = 'web';
        $permissionName = 'execute-data-reset';

        $permission = DB::table('permissions')
            ->where('name', $permissionName)
            ->where('guard_name', $guardName)
            ->first();

        if ($permission) {
            DB::table('role_has_permissions')->where('permission_id', $permission->id)->delete();
            DB::table('model_has_permissions')->where('permission_id', $permission->id)->delete();
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
