<?php

namespace Database\Seeders;

use App\Models\Estate;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'admin' => Role::findOrCreate('admin', 'web'),
            'estate' => Role::findOrCreate('estate', 'web'),
            'Manager' => Role::findOrCreate('Manager', 'web'),
            'Finance' => Role::findOrCreate('Finance', 'web'),
        ];

        $estates = Estate::query()->get()->keyBy('estate_id');
        $hoEstate = $estates->get('HO');

        if ($hoEstate) {
            $this->upsertUser(
                [
                    'username' => 'admin',
                    'name' => 'Admin Portal Asset',
                    'email' => 'admin@portalasset.test',
                    'password' => 'admin123',
                    'estate_id' => $hoEstate->id,
                ],
                $roles['admin']
            );
        }

        foreach ($estates as $estateCode => $estate) {
            $code = strtolower($estateCode);

            $this->upsertUser(
                [
                    'username' => "estate_{$code}",
                    'name' => "User Estate {$estateCode}",
                    'email' => "estate.{$code}@portalasset.test",
                    'password' => 'user123',
                    'estate_id' => $estate->id,
                ],
                $roles['estate']
            );

            $this->upsertUser(
                [
                    'username' => "manager_{$code}",
                    'name' => "Manager {$estateCode}",
                    'email' => "manager.{$code}@portalasset.test",
                    'password' => 'user123',
                    'estate_id' => $estate->id,
                ],
                $roles['Manager']
            );

            $this->upsertUser(
                [
                    'username' => "finance_{$code}",
                    'name' => "Finance {$estateCode}",
                    'email' => "finance.{$code}@portalasset.test",
                    'password' => 'user123',
                    'estate_id' => $estate->id,
                ],
                $roles['Finance']
            );
        }
    }

    private function upsertUser(array $data, Role $role): void
    {
        $user = User::updateOrCreate(
            ['username' => $data['username']],
            [
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'estate_id' => $data['estate_id'],
                'role_id' => $role->id,
                'not_active' => false,
            ]
        );

        $user->syncRoles([$role]);
    }
}
