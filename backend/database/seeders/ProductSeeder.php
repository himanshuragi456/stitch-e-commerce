<?php

namespace Database\Seeders;

use App\Models\Product;
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

}
