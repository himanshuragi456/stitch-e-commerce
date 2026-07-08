<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compact product shape for cards/grids/suggestions.
 *
 * @mixin Product
 */
class ProductListResource extends JsonResource
{
    /**
     * Use the trimmed pagination meta for collections of this resource.
     *
     * @param  mixed  $resource
     */
    public static function collection($resource): PaginatedCollection
    {
        return new PaginatedCollection($resource, static::class);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $primary = $this->relationLoaded('images')
            ? $this->images->firstWhere('is_primary', true) ?? $this->images->first()
            : $this->primaryImage()->first();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'intended_use' => $this->intended_use->value,
            'material' => $this->material,
            'color' => $this->color,
            'pattern' => $this->pattern,
            'primary_image' => $primary ? new ProductImageResource($primary) : null,
            'price_per_metre_paise' => $this->price_per_metre_paise,
            'compare_at_per_metre_paise' => $this->compare_at_per_metre_paise,
            'in_stock' => $this->in_stock,
            'is_featured' => $this->is_featured,
        ];
    }
}
