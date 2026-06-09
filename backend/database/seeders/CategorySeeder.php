<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Shirting', 'description' => 'Premium cloth for tailored shirts.'],
            ['name' => 'Trousers & Pants', 'description' => 'Durable fabric for trousers and formal pants.'],
            ['name' => 'Suiting', 'description' => 'Refined suiting material for jackets and suits.'],
            ['name' => 'Kurta Fabric', 'description' => 'Comfortable cloth for kurtas and ethnic wear.'],
            ['name' => 'Ethnic & Festive', 'description' => 'Rich fabrics for festive and traditional outfits.'],
        ];

        foreach ($categories as $i => $data) {
            Category::updateOrCreate(
                ['slug' => Str::slug($data['name'])],
                [
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'position' => $i,
                    'is_active' => true,
                    'meta_title' => $data['name'].' — Shree Krishna Collection',
                    'meta_description' => $data['description'],
                ]
            );
        }
    }
}
