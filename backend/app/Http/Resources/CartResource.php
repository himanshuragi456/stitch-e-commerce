<?php

namespace App\Http\Resources;

use App\Models\Cart;
use App\Services\SettingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Cart */
class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = CartItemResource::collection($this->items);

        $subtotalPaise = $this->items->sum(fn ($item) => $item->lineTotalPaise());
        $itemCount = $this->items->sum('quantity');

        $settings = app(SettingService::class);
        $freeThreshold = (int) $settings->get('shipping.free_threshold_paise', 0);
        $flatRate = (int) $settings->get('shipping.flat_rate_paise', 0);
        $shippingPaise = ($freeThreshold > 0 && $subtotalPaise >= $freeThreshold) ? 0 : $flatRate;

        // Coupons are only applied at checkout; the cart itself carries no discount.
        $discountPaise = 0;
        $totalPaise = max(0, $subtotalPaise + $shippingPaise - $discountPaise);

        return [
            'id' => $this->id,
            'token' => $this->token,
            'items' => $items,
            'subtotal_paise' => $subtotalPaise,
            'discount_paise' => $discountPaise,
            'shipping_paise' => $shippingPaise,
            'total_paise' => $totalPaise,
            'item_count' => $itemCount,
        ];
    }
}
