<?php

use App\Services\EstateRoleDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (EstateRoleDefaults::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $estateRole = Role::findOrCreate(EstateRoleDefaults::ROLE_NAME, 'web');
        $estateRole->givePermissionTo(EstateRoleDefaults::PERMISSIONS);

        $duplicateGroups = DB::table('users')
            ->select('estate_id', DB::raw('MIN(id) as keeper_id'))
            ->where('role_id', $estateRole->id)
            ->where('not_active', false)
            ->whereNotNull('estate_id')
            ->whereNull('deleted_at')
            ->groupBy('estate_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicateGroups as $group) {
            $duplicateIds = DB::table('users')
                ->where('role_id', $estateRole->id)
                ->where('estate_id', $group->estate_id)
                ->where('not_active', false)
                ->whereNull('deleted_at')
                ->where('id', '<>', $group->keeper_id)
                ->pluck('id');

            if ($duplicateIds->isEmpty()) {
                continue;
            }

            DB::table('users')
                ->whereIn('id', $duplicateIds)
                ->update([
                    'role_id' => null,
                    'not_active' => true,
                    'access_setup_required' => false,
                    'updated_at' => now(),
                ]);

            DB::table('model_has_roles')
                ->where('role_id', $estateRole->id)
                ->where('model_type', App\Models\User::class)
                ->whereIn('model_id', $duplicateIds)
                ->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $estateRole = Role::where('guard_name', 'web')
            ->where('name', EstateRoleDefaults::ROLE_NAME)
            ->first();

        if ($estateRole) {
            $estateRole->revokePermissionTo(EstateRoleDefaults::PERMISSIONS);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
