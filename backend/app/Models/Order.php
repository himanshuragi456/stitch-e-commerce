<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_number',
        'customer_id',
        'status',
        'subtotal_paise',
        'shipping_paise',
        'discount_paise',
        'total_paise',
        'coupon_id',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'billing_address',
        'payment_status',
        'payment_method',
        'notes',
        'placed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'subtotal_paise' => 'integer',
            'shipping_paise' => 'integer',
            'discount_paise' => 'integer',
            'total_paise' => 'integer',
            'shipping_address' => 'array',
            'billing_address' => 'array',
            'placed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Customer, Order> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<OrderItem> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<Payment> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** @return BelongsTo<Coupon, Order> */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function getItemCountAttribute(): int
    {
        return (int) $this->items->sum('quantity');
    }

    /** @param Builder<Order> $query */
    public function scopeStatus(Builder $query, OrderStatus $status): void
    {
        $query->where('status', $status);
    }
}
