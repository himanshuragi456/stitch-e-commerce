<?php

namespace App\Http\Resources;

use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CartItem */
class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $product = $this->product;
        $primaryImage = $product?->images->firstWhere('is_primary', true)
            ?? $product?->images->first();

        // length is still offered and enough stock for at least 1 unit.
        $available = $product && $product->is_active
            && $product->lengthPurchasable($this->length_metres);

        return [
            'id' => $this->id,
            'quantity' => $this->quantity,
            'length_metres' => $this->length_metres,
            'unit_price_paise' => $this->unitPricePaise(),
            'line_total_paise' => $this->lineTotalPaise(),
            'available' => $available,
            'product' => $product ? [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'price_per_metre_paise' => $product->price_per_metre_paise,
                'primary_image' => $primaryImage ? [
                    'thumb_url' => $primaryImage->thumb_url ?? $primaryImage->url,
                    'alt' => $primaryImage->alt,
                ] : null,
            ] : null,
        ];
    }
}
