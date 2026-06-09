<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductLength;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductLength
 */
class ProductLengthResource extends JsonResource
{
    /**
     * The owning product, injected so price/stock can be computed without an
     * extra query per length. Set via ProductLengthResource::for($product).
     */
    private ?Product $product = null;

    public function withProduct(Product $product): static
    {
        $this->product = $product;

        return $this;
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $product = $this->product ?? $this->product()->getResults();

        return [
            'id' => $this->id,
            'length_metres' => (string) $this->length_metres,
            'position' => $this->position,
            'unit_price_paise' => $product?->priceForLength($this->length_metres) ?? 0,
            'purchasable' => (bool) $product?->lengthPurchasable($this->length_metres),
        ];
    }
}
