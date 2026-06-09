<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'store' => [
                'name' => 'Shree Krishna Collection',
                'email' => 'hello@shreekrishnacollection.com',
                'phone' => '+91 90000 00000',
                'address' => [
                    'line1' => 'Shop 12, Textile Market',
                    'line2' => 'Ring Road',
                    'city' => 'Surat',
                    'state' => 'Gujarat',
                    'pincode' => '395002',
                    'country' => 'IN',
                ],
            ],
            'shipping' => [
                'flat_rate_paise' => 5000,        // ₹50 flat
                'free_threshold_paise' => 199900, // free over ₹1999
            ],
            'social' => [
                'instagram' => 'https://instagram.com/shreekrishnacollection',
                'facebook' => 'https://facebook.com/shreekrishnacollection',
                'whatsapp' => 'https://wa.me/919000000000',
            ],
            // "Today's style suggestion" — a landscape YouTube video the admin
            // updates daily from the panel. Shown on the storefront home page.
            'style_video' => [
                'enabled' => true,
                'title' => "Today's Style Suggestion",
                'subtitle' => 'A fresh pairing idea from our studio, every day.',
                'youtube_url' => 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
            ],
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
