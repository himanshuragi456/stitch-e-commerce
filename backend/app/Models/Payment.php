<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = [
        'order_id',
        'gateway',
        'gateway_order_id',
        'gateway_payment_id',
        'gateway_signature',
        'amount_paise',
        'status',
        'raw_payload',
    ];

    protected function casts(): array
    {
        return [
            'amount_paise' => 'integer',
            'raw_payload' => 'array',
        ];
    }

    /** @return BelongsTo<Order, Payment> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
