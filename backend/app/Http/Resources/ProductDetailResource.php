<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;

/**
 * Full product detail. Extends the compact shape with description, images,
 * offered lengths (with computed price/purchasable), and SEO fields.
 *
 * @mixin Product
 */
class ProductDetailResource extends ProductListResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'stock_metres' => (string) $this->stock_metres,
            'sku' => $this->sku,
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'lengths' => $this->whenLoaded('lengths', fn () => $this->lengths->map(
                fn ($length) => (new ProductLengthResource($length))
                    ->withProduct($this->resource)
            )),
            'suggestions' => ProductListResource::collection($this->whenLoaded('suggestions')),
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ]);
    }
}
