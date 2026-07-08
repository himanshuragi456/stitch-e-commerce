<?php

namespace App\Http\Resources;

use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin OrderItem */
class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_name' => $this->product_name,
            'length_metres' => $this->length_metres,
            'price_per_metre_paise' => $this->price_per_metre_paise,
            'sku' => $this->sku,
            'unit_price_paise' => $this->unit_price_paise,
            'quantity' => $this->quantity,
            'line_total_paise' => $this->line_total_paise,
        ];
    }
}
