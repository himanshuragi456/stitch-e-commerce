<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductLength extends Model
{
    use HasUuids;

    protected $fillable = [
        'product_id',
        'length_metres',
        'position',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'length_metres' => 'decimal:2',
            'position' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Product, ProductLength> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
