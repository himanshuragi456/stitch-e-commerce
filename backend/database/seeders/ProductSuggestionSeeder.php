<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Wires curated pairing suggestions so the storefront "Pairs well with" section
 * has real data. For each product, picks a few complementary-use products.
 */
class ProductSuggestionSeeder extends Seeder
{
    public function run(): void
    {
        $products = Product::with('lengths')->get();

        foreach ($products as $product) {
            $complementaryUses = collect($product->intended_use->complementaryUses())
                ->map(fn ($use) => $use->value)
                ->all();

            $suggestions = $products
                ->where('id', '!=', $product->id)
                ->filter(fn (Product $p) => in_array($p->intended_use->value, $complementaryUses, true))
                ->take(6)
                ->values();

            $sync = [];
            foreach ($suggestions as $i => $suggested) {
                $sync[$suggested->id] = ['position' => $i];
            }

            if ($sync !== []) {
                $product->suggestions()->sync($sync);
            }
        }
    }
}
