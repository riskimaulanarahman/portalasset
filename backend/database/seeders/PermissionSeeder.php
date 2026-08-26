<?php

namespace Database\Seeders;

use App\Services\EstateRoleDefaults;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            'view-business-units', 'create-business-units', 'edit-business-units', 'delete-business-units',
            'view-sections', 'create-sections', 'edit-sections', 'delete-sections',
            'view-estates', 'create-estates', 'edit-estates', 'delete-estates',
            'view-categories', 'create-categories', 'edit-categories', 'delete-categories',
            'view-materials', 'create-materials', 'edit-materials', 'delete-materials',
            'view-material-stock-opnames', 'create-material-stock-opnames', 'edit-material-stock-opnames',
            'count-material-stock-opnames', 'review-material-stock-opnames', 'submit-material-stock-opnames',
            'cancel-material-stock-opnames', 'export-material-stock-opnames', 'post-material-stock-opnames',
            'view-asset-types', 'create-asset-types', 'edit-asset-types', 'delete-asset-types',
            'view-asset-departments', 'create-asset-departments', 'edit-asset-departments', 'delete-asset-departments',
            'view-asset-divisions', 'create-asset-divisions', 'edit-asset-divisions', 'delete-asset-divisions',
            'view-asset-regs', 'create-asset-regs', 'edit-asset-regs', 'delete-asset-regs',
            'view-manufacturers', 'create-manufacturers', 'edit-manufacturers', 'delete-manufacturers',
            'view-assets', 'create-assets', 'edit-assets', 'delete-assets', 'assign-asset-members',
            'view-asset-reports', 'create-asset-reports',
            'view-asset-conditions', 'create-asset-conditions', 'edit-asset-conditions', 'delete-asset-conditions',
            'view-asset-maintenances', 'create-asset-maintenances', 'edit-asset-maintenances', 'delete-asset-maintenances',
            'view-write-offs', 'create-write-offs', 'cancel-write-offs', 'download-write-off-ba',
            'view-transactions', 'create-transactions', 'edit-transactions', 'delete-transactions',
            'view-transfers', 'create-transfers', 'edit-transfers', 'delete-transfers',
            'cancel-transfers', 'download-transfer-ba', 'view-transfer-history',
            'view-anggotas', 'create-anggotas', 'edit-anggotas', 'delete-anggotas',
            'view-cost-centers', 'create-cost-centers', 'edit-cost-centers', 'delete-cost-centers',
            'view-units', 'create-units', 'edit-units', 'delete-units',
            'view-vendors', 'create-vendors', 'edit-vendors', 'delete-vendors',
            'view-users', 'create-users', 'edit-users', 'delete-users',
            'view-user-activations', 'edit-user-activations',
            'view-roles', 'create-roles', 'edit-roles', 'delete-roles',
            'view-approval-workflows', 'create-approval-workflows', 'edit-approval-workflows', 'delete-approval-workflows',
            'edit-settings',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // Create roles and assign existing permissions
        $adminRole = Role::findOrCreate('admin', 'web');
        $adminRole->givePermissionTo(Permission::all());

        $guestRole = Role::findOrCreate('guest', 'web');
        $guestRole->syncPermissions([
            'view-assets',
            'view-materials',
            'view-transactions',
            'view-estates',
        ]);

        $estateRole = Role::findOrCreate('estate', 'web');
        $estatePermissions = EstateRoleDefaults::PERMISSIONS;
        $estateRole->syncPermissions($estatePermissions);

        $managerRole = Role::findOrCreate('manager', 'web');
        $managerRole->syncPermissions(array_values(array_unique(array_merge($estatePermissions, [
            'review-material-stock-opnames',
        ]))));

        $financeRole = Role::findOrCreate('finance', 'web');
        $financeRole->syncPermissions(array_values(array_unique(array_merge($estatePermissions, [
            'review-material-stock-opnames',
            'post-material-stock-opnames',
        ]))));
    }
}
