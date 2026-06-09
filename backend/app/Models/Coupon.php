<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'type',
        'value',
        'min_order_paise',
        'usage_limit',
        'used_count',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'integer',
            'min_order_paise' => 'integer',
            'usage_limit' => 'integer',
            'used_count' => 'integer',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function isValidNow(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return false;
        }
        $now = Carbon::now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }
        if ($this->expires_at && $now->gt($this->expires_at)) {
            return false;
        }

        return true;
    }

    /** Discount in paise for a given subtotal. */
    public function discountFor(int $subtotalPaise): int
    {
        if ($this->min_order_paise && $subtotalPaise < $this->min_order_paise) {
            return 0;
        }

        $discount = $this->type === 'percent'
            ? (int) round($subtotalPaise * ($this->value / 100))
            : $this->value;

        return min($discount, $subtotalPaise);
    }
}
