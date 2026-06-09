<?php

namespace App\Models;

use App\Enums\IntendedUse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category_id',
        'intended_use',
        'material',
        'color',
        'color_hex',
        'pattern',
        'price_per_metre_paise',
        'compare_at_per_metre_paise',
        'stock_metres',
        'sku',
        'is_active',
        'is_featured',
        'position',
        'meta_title',
        'meta_description',
    ];

    protected function casts(): array
    {
        return [
            'intended_use' => IntendedUse::class,
            'price_per_metre_paise' => 'integer',
            'compare_at_per_metre_paise' => 'integer',
            'stock_metres' => 'decimal:2',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * Compute the price of one piece of the given length: per_metre × length.
     * Strictly linear, rounded to the nearest paise.
     */
    public function priceForLength(float|string $lengthMetres): int
    {
        return (int) round($this->price_per_metre_paise * (float) $lengthMetres);
    }

    /** Whether a given length is currently purchasable (enough metre stock). */
    public function lengthPurchasable(float|string $lengthMetres): bool
    {
        return (float) $this->stock_metres >= (float) $lengthMetres;
    }

    public function getInStockAttribute(): bool
    {
        return (float) $this->stock_metres > 0;
    }

    // --- Relationships -------------------------------------------------------

    /** @return BelongsTo<Category, Product> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<ProductLength> */
    public function lengths(): HasMany
    {
        return $this->hasMany(ProductLength::class)->orderBy('position');
    }

    /** @return HasMany<ProductImage> */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('position');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Curated pairing suggestions (ordered). Self-referential many-to-many.
     *
     * @return BelongsToMany<Product>
     */
    public function suggestions(): BelongsToMany
    {
        return $this->belongsToMany(
            Product::class,
            'product_suggestions',
            'product_id',
            'suggested_product_id'
        )->withPivot('position')->orderBy('product_suggestions.position');
    }

    // --- Scopes --------------------------------------------------------------

    /** @param Builder<Product> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** @param Builder<Product> $query */
    public function scopeFeatured(Builder $query): void
    {
        $query->where('is_featured', true);
    }
}
