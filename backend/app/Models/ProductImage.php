<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImage extends Model
{
    use HasUuids;

    protected $fillable = [
        'product_id',
        'path',
        'thumb_path',
        'alt',
        'is_primary',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function getUrlAttribute(): string
    {
        return $this->resolveUrl($this->path);
    }

    public function getThumbUrlAttribute(): string
    {
        return $this->resolveUrl($this->thumb_path ?? $this->path);
    }

    /**
     * Absolute URLs (e.g. seeded placeholders) pass through unchanged; stored
     * relative paths are resolved against the public disk.
     */
    private function resolveUrl(string $path): string
    {
        return Str::startsWith($path, ['http://', 'https://'])
            ? $path
            : asset(Storage::url($path));
    }

    /** @return BelongsTo<Product, ProductImage> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
