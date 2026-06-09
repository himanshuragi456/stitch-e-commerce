<?php

namespace Database\Seeders;

use App\Enums\StaffRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Permissions used across the admin API (see docs/20-BACKEND-PLAN.md §3.1).
     */
    private const PERMISSIONS = [
        'manage-products',
        'manage-orders',
        'view-orders',
        'print-labels',
        'manage-staff',
        'manage-settings',
        'manage-customers',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'staff');
        }

        // Admin: everything.
        $admin = Role::findOrCreate(StaffRole::Admin->value, 'staff');
        $admin->syncPermissions(self::PERMISSIONS);

        // Employee: view orders + print shipping labels only.
        $employee = Role::findOrCreate(StaffRole::Employee->value, 'staff');
        $employee->syncPermissions(['view-orders', 'print-labels']);
    }
}
