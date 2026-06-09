<?php

namespace Database\Seeders;

use App\Enums\StaffRole;
use App\Models\Staff;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $admin = Staff::updateOrCreate(
            ['email' => 'admin@skc.test'],
            [
                'name' => 'SKC Admin',
                'password' => Hash::make('password'),
                'role' => StaffRole::Admin,
                'is_active' => true,
            ]
        );
        $admin->syncRoles([StaffRole::Admin->value]);

        $employee = Staff::updateOrCreate(
            ['email' => 'employee@skc.test'],
            [
                'name' => 'SKC Employee',
                'password' => Hash::make('password'),
                'role' => StaffRole::Employee,
                'is_active' => true,
            ]
        );
        $employee->syncRoles([StaffRole::Employee->value]);
    }
}
