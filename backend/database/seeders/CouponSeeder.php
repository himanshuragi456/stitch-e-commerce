<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        Coupon::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'type' => 'percent',
                'value' => 10,
                'min_order_paise' => 100000, // ₹1000
                'usage_limit' => null,
                'is_active' => true,
            ]
        );

        Coupon::updateOrCreate(
            ['code' => 'FLAT200'],
            [
                'type' => 'fixed',
                'value' => 20000, // ₹200 off
                'min_order_paise' => 200000, // ₹2000
                'usage_limit' => 100,
                'is_active' => true,
            ]
        );
    }
}
