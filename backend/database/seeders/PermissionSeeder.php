<?php

namespace Database\Seeders;

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
            'view-asset-types', 'create-asset-types', 'edit-asset-types', 'delete-asset-types',
            'view-asset-regs', 'create-asset-regs', 'edit-asset-regs', 'delete-asset-regs',
            'view-manufacturers', 'create-manufacturers', 'edit-manufacturers', 'delete-manufacturers',
            'view-assets', 'create-assets', 'edit-assets', 'delete-assets',
            'view-transactions', 'create-transactions', 'edit-transactions', 'delete-transactions',
            'view-anggotas', 'create-anggotas', 'edit-anggotas', 'delete-anggotas',
            'view-cost-centers', 'create-cost-centers', 'edit-cost-centers', 'delete-cost-centers',
            'view-software', 'create-software', 'edit-software', 'delete-software',
            'view-units', 'create-units', 'edit-units', 'delete-units',
            'view-vendors', 'create-vendors', 'edit-vendors', 'delete-vendors',
            'view-users', 'create-users', 'edit-users', 'delete-users',
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

        $estateRole = Role::findOrCreate('estate', 'web');
        $estatePermissions = [
            'view-assets', 'view-materials', 'create-materials', 'edit-materials',
            'view-transactions', 'create-transactions', 'view-estates',
            'view-anggotas', 'create-anggotas', 'edit-anggotas', 'delete-anggotas',
            'view-cost-centers', 'view-software', 'view-units', 'view-vendors',
        ];
        $estateRole->syncPermissions($estatePermissions);

        $managerRole = Role::findOrCreate('Manager', 'web');
        $managerRole->syncPermissions($estatePermissions);

        $financeRole = Role::findOrCreate('Finance', 'web');
        $financeRole->syncPermissions($estatePermissions);
    }
}
