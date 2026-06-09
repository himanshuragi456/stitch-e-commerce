<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'cart_id',
        'product_id',
        'length_metres',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'length_metres' => 'decimal:2',
            'quantity' => 'integer',
        ];
    }

    /** Unit price for one piece of this length = per_metre × length. */
    public function unitPricePaise(): int
    {
        return $this->product?->priceForLength($this->length_metres) ?? 0;
    }

    public function lineTotalPaise(): int
    {
        return $this->unitPricePaise() * $this->quantity;
    }

    /** Metres consumed by this line = length × quantity. */
    public function metresConsumed(): float
    {
        return (float) $this->length_metres * $this->quantity;
    }

    /** @return BelongsTo<Cart, CartItem> */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    /** @return BelongsTo<Product, CartItem> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
