<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductLength;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /** Common length sets offered by products (metres). */
    private const LENGTH_SETS = [
        [1.25, 1.30, 1.50],
        [1.50, 2.00, 2.50],
        [1.00, 1.50, 2.00, 2.50],
        [2.50, 3.00],
        [1.30, 1.60],
    ];

    public function run(): void
    {
        Product::factory()
            ->count(40)
            ->create()
            ->each(function (Product $product) {
                $this->seedLengths($product);
                $this->seedImages($product);
            });
    }

    private function seedLengths(Product $product): void
    {
        $set = self::LENGTH_SETS[array_rand(self::LENGTH_SETS)];
        foreach ($set as $i => $metres) {
            ProductLength::create([
                'product_id' => $product->id,
                'length_metres' => $metres,
                'position' => $i,
                'is_active' => true,
            ]);
        }
    }

    /**
     * Verified Unsplash fabric/textile photo IDs. Real cloth imagery for seed
     * data; real uploads (WebP + thumb) are handled by ImageService in the admin.
     */
    private const FABRIC_IMAGE_IDS = [
        '1594734415578-00fc9540929b', // white textile on wooden table
        '1583339824000-5afecfd41835', // white textile on white textile
        '1634393654272-9f6b168356fd', // soft pink fabric close-up
        '1558769132-cb1aea458c5e',    // textile / fashion
        '1591047139829-d91aecb6caea', // stacked folded clothes
        '1489987707025-afc232f7ea0f', // clothing on rack
        '1473966968600-fa801b869a1a', // fabric texture
        '1604176354204-9268737828e4', // linen / neutral cloth
    ];

    private function seedImages(Product $product): void
    {
        $count = random_int(1, 4);
        // Deterministic-but-varied: offset into the fabric pool by product hash.
        $offset = hexdec(substr(md5($product->id), 0, 4));
        $pool = self::FABRIC_IMAGE_IDS;

        for ($i = 0; $i < $count; $i++) {
            $id = $pool[($offset + $i) % count($pool)];
            $base = "https://images.unsplash.com/photo-{$id}?auto=format&fit=crop&q=70";

            ProductImage::create([
                'product_id' => $product->id,
                'path' => "{$base}&w=1000",
                'thumb_path' => "{$base}&w=400",
                'alt' => "{$product->name} — fabric swatch ".($i + 1),
                'is_primary' => $i === 0,
                'position' => $i,
            ]);
        }
    }
}
