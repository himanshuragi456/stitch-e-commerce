<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'length_metres',
        'price_per_metre_paise',
        'sku',
        'unit_price_paise',
        'quantity',
        'line_total_paise',
    ];

    protected function casts(): array
    {
        return [
            'length_metres' => 'decimal:2',
            'price_per_metre_paise' => 'integer',
            'unit_price_paise' => 'integer',
            'quantity' => 'integer',
            'line_total_paise' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, OrderItem> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<Product, OrderItem> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
