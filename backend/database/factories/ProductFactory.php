<?php

namespace Database\Factories;

use App\Enums\IntendedUse;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $materials = ['Cotton', 'Linen', 'Cotton Blend', 'Silk Blend', 'Poly Cotton', 'Khadi', 'Tencel'];
        $patterns = ['Solid', 'Checked', 'Striped', 'Printed', 'Textured', 'Self-design'];
        $colors = [
            'Sky Blue', 'Charcoal', 'Ivory', 'Maroon', 'Olive', 'Navy',
            'Sand', 'Black', 'Mustard', 'Sage', 'Rust', 'Powder Pink',
        ];

        $colorName = $this->faker->randomElement($colors);
        $material = $this->faker->randomElement($materials);
        $pattern = $this->faker->randomElement($patterns);
        $use = $this->faker->randomElement(IntendedUse::cases());

        $name = trim("{$material} {$use->label()} Fabric — {$colorName}");

        // Price per metre between ₹180 and ₹950 (in paise).
        $perMetre = $this->faker->numberBetween(180, 950) * 100;
        $hasDiscount = $this->faker->boolean(30);

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'description' => $this->faker->paragraphs(2, true),
            'category_id' => Category::query()->inRandomOrder()->value('id'),
            'intended_use' => $use,
            'material' => $material,
            'color' => $colorName,
            'pattern' => $pattern,
            'price_per_metre_paise' => $perMetre,
            'compare_at_per_metre_paise' => $hasDiscount ? (int) round($perMetre * 1.2) : null,
            'stock_metres' => $this->faker->randomFloat(2, 0, 80),
            'sku' => 'SKC-'.Str::upper(Str::random(8)),
            'is_active' => true,
            'is_featured' => $this->faker->boolean(25),
            'position' => $this->faker->numberBetween(0, 100),
            'meta_title' => $name.' — Shree Krishna Collection',
            'meta_description' => "Buy {$colorName} {$material} fabric per metre for {$use->label()}. Premium unstitched cloth from Shree Krishna Collection.",
        ];
    }
}
