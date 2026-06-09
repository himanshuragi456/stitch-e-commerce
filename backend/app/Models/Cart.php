<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    use HasUuids;

    protected $fillable = [
        'customer_id',
        'token',
    ];

    /** @return BelongsTo<Customer, Cart> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<CartItem> */
    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }
}
