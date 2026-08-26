<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $guardName = 'web';
        $userRole = DB::table('roles')->where('name', 'user')->where('guard_name', $guardName)->first();
        $guestRole = DB::table('roles')->where('name', 'guest')->where('guard_name', $guardName)->first();

        if ($userRole && $guestRole) {
            DB::table('model_has_roles')->where('role_id', $userRole->id)->update(['role_id' => $guestRole->id]);
            DB::table('users')->where('role_id', $userRole->id)->update(['role_id' => $guestRole->id]);

            $permissionIds = DB::table('role_has_permissions')->where('role_id', $userRole->id)->pluck('permission_id');
            foreach ($permissionIds as $permissionId) {
                if (!DB::table('role_has_permissions')->where('role_id', $guestRole->id)->where('permission_id', $permissionId)->exists()) {
                    DB::table('role_has_permissions')->insert([
                        'role_id' => $guestRole->id,
                        'permission_id' => $permissionId,
                    ]);
                }
            }

            DB::table('role_has_permissions')->where('role_id', $userRole->id)->delete();
            DB::table('roles')->where('id', $userRole->id)->delete();
        } elseif ($userRole) {
            DB::table('roles')->where('id', $userRole->id)->update([
                'name' => 'guest',
                'updated_at' => now(),
            ]);
            $guestRole = DB::table('roles')->where('id', $userRole->id)->first();
        } elseif (!$guestRole) {
            $guestRoleId = DB::table('roles')->insertGetId([
                'name' => 'guest',
                'guard_name' => $guardName,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $guestRole = DB::table('roles')->where('id', $guestRoleId)->first();
        }

        if ($guestRole) {
            $this->syncGuestPermissions($guestRole->id, $guardName);
        }
    }

    public function down(): void
    {
        $guardName = 'web';
        $guestRole = DB::table('roles')->where('name', 'guest')->where('guard_name', $guardName)->first();
        $userRole = DB::table('roles')->where('name', 'user')->where('guard_name', $guardName)->first();

        if ($guestRole && !$userRole) {
            DB::table('roles')->where('id', $guestRole->id)->update([
                'name' => 'user',
                'updated_at' => now(),
            ]);
        }
    }

    private function syncGuestPermissions(int $roleId, string $guardName): void
    {
        $permissionNames = [
            'view-assets',
            'view-materials',
            'view-transactions',
            'view-estates',
        ];

        $permissionIds = DB::table('permissions')
            ->whereIn('name', $permissionNames)
            ->where('guard_name', $guardName)
            ->pluck('id');

        DB::table('role_has_permissions')->where('role_id', $roleId)->delete();

        foreach ($permissionIds as $permissionId) {
            DB::table('role_has_permissions')->insert([
                'role_id' => $roleId,
                'permission_id' => $permissionId,
            ]);
        }
    }
};
