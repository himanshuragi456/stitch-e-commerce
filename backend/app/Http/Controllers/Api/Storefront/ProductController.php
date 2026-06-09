<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ProductController extends Controller
{
    /**
     * GET /api/products
     * Filters: category(slug), intended_use, material, color, min_price, max_price,
     * search; sort: newest|price_asc|price_desc; paginated.
     */
    public function index(Request $request): ResourceCollection
    {
        $query = Product::query()
            ->active()
            ->with(['category', 'images']);

        if ($slug = $request->string('category')->toString()) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $slug));
        }

        if ($use = $request->string('intended_use')->toString()) {
            $query->where('intended_use', $use);
        }

        if ($material = $request->string('material')->toString()) {
            $query->where('material', $material);
        }

        if ($color = $request->string('color')->toString()) {
            $query->where('color', $color);
        }

        // Price filters apply to price_per_metre (paise). Accept rupees in the query.
        if ($request->filled('min_price')) {
            $query->where('price_per_metre_paise', '>=', (int) round($request->float('min_price') * 100));
        }
        if ($request->filled('max_price')) {
            $query->where('price_per_metre_paise', '<=', (int) round($request->float('max_price') * 100));
        }

        if ($search = trim($request->string('search')->toString() ?: $request->string('q')->toString())) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('material', 'like', "%{$search}%")
                    ->orWhere('color', 'like', "%{$search}%")
                    ->orWhere('pattern', 'like', "%{$search}%");
            });
        }

        match ($request->string('sort')->toString()) {
            'price_asc' => $query->orderBy('price_per_metre_paise'),
            'price_desc' => $query->orderByDesc('price_per_metre_paise'),
            default => $query->orderByDesc('created_at'),
        };

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 60);

        return ProductListResource::collection($query->paginate($perPage));
    }

    /**
     * GET /api/products/{product:slug}
     */
    public function show(Product $product): ProductDetailResource
    {
        abort_unless($product->is_active, 404);

        $product->load([
            'category',
            'images',
            'lengths' => fn ($q) => $q->where('is_active', true),
            'suggestions' => fn ($q) => $q->active()->with(['category', 'images']),
        ]);

        return new ProductDetailResource($product);
    }

    /**
     * GET /api/products/{product}/suggestions
     */
    public function suggestions(Product $product): ResourceCollection
    {
        $suggestions = $product->suggestions()
            ->active()
            ->with(['category', 'images'])
            ->get();

        return ProductListResource::collection($suggestions);
    }
}
