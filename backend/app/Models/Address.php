<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasUuids;

    protected $fillable = [
        'customer_id',
        'label',
        'name',
        'phone',
        'line1',
        'line2',
        'city',
        'state',
        'pincode',
        'country',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /** @return BelongsTo<Customer, Address> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
