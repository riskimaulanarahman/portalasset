<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class EstateRoleDefaults
{
    public const ROLE_NAME = 'estate';

    public const PERMISSIONS = [
        'view-assets',
        'assign-asset-members',
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
        'view-materials',
        'create-materials',
        'edit-materials',
        'view-material-stock-opnames',
        'create-material-stock-opnames',
        'edit-material-stock-opnames',
        'count-material-stock-opnames',
        'submit-material-stock-opnames',
        'cancel-material-stock-opnames',
        'export-material-stock-opnames',
        'view-transactions',
        'create-transactions',
        'view-estates',
        'view-transfers',
        'create-transfers',
        'cancel-transfers',
        'download-transfer-ba',
        'view-transfer-history',
        'view-anggotas',
        'create-anggotas',
        'edit-anggotas',
        'delete-anggotas',
        'view-cost-centers',
        'view-units',
        'view-vendors',
    ];

    public function ensurePermissions(): Role
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $role = Role::findOrCreate(self::ROLE_NAME, 'web');
        $role->givePermissionTo(self::PERMISSIONS);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $role;
    }

    public function isEstateRole(?Role $role): bool
    {
        return $role && mb_strtolower($role->name) === self::ROLE_NAME;
    }

    public function assertSingleActiveEstateUser(string|int|null $estateId, ?int $ignoreUserId = null): void
    {
        if (!$estateId || !ctype_digit((string) $estateId)) {
            throw ValidationException::withMessages([
                'estate_id' => ['Estate wajib dipilih untuk role estate.'],
            ]);
        }

        $estateRole = Role::where('guard_name', 'web')
            ->where('name', self::ROLE_NAME)
            ->first();

        if (!$estateRole) {
            return;
        }

        $query = User::query()
            ->where('role_id', $estateRole->id)
            ->where('estate_id', (string) $estateId)
            ->where('not_active', false);

        if ($ignoreUserId) {
            $query->where('id', '<>', $ignoreUserId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'estate_id' => ['Role estate aktif untuk estate ini sudah ada. Nonaktifkan user estate lama terlebih dahulu.'],
            ]);
        }
    }

    /**
     * @return array<int, string>
     */
    public function occupiedActiveEstateIds(?int $ignoreUserId = null): array
    {
        $estateRole = Role::where('guard_name', 'web')
            ->where('name', self::ROLE_NAME)
            ->first();

        if (!$estateRole) {
            return [];
        }

        $query = User::query()
            ->where('role_id', $estateRole->id)
            ->where('not_active', false)
            ->whereNotNull('estate_id');

        if ($ignoreUserId) {
            $query->where('id', '<>', $ignoreUserId);
        }

        return $query->pluck('estate_id')->map(fn ($estateId) => (string) $estateId)->all();
    }
}
