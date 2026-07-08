<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\IntendedUse;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaginatedCollection;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductImageResource;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use App\Services\ImageService;
use App\Services\StorefrontRebuildService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminProductController extends Controller
{
    public function __construct(
        private readonly ImageService $images,
        private readonly StorefrontRebuildService $rebuild,
    ) {}

    /**
     * GET /api/admin/products
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'name_asc', 'price_asc', 'price_desc', 'stock_asc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Product::withTrashed()
            ->with(['category', 'primaryImage'])
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', "%{$request->search}%")
                ->orWhere('sku', 'like', "%{$request->search}%")
            )
            ->when($request->filled('category'), fn ($q) => $q->whereHas('category', fn ($c) => $c->where('slug', $request->category))
            )
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active'))
            );

        match ($request->input('sort', 'newest')) {
            'oldest' => $query->oldest(),
            'name_asc' => $query->orderBy('name'),
            'price_asc' => $query->orderBy('price_per_metre_paise'),
            'price_desc' => $query->orderByDesc('price_per_metre_paise'),
            'stock_asc' => $query->orderBy('stock_metres'),
            default => $query->orderByDesc('created_at'),
        };

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        return (new PaginatedCollection($query->paginate($perPage), ProductListResource::class))->response();
    }

    /**
     * POST /api/admin/products
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateProduct($request);
        $data['slug'] = $this->uniqueSlug($data['name'], $data['slug'] ?? null);

        $product = Product::create($data);

        $this->rebuild->trigger('product-created');

        return response()->json(['data' => new ProductDetailResource($product->load(['lengths', 'images', 'suggestions']))], 201);
    }

    /**
     * GET /api/admin/products/{id}
     */
    public function show(string $id): JsonResponse
    {
        $product = Product::withTrashed()->with(['lengths', 'images', 'category', 'suggestions'])->findOrFail($id);

        return response()->json(['data' => new ProductDetailResource($product)]);
    }

    /**
     * PATCH /api/admin/products/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($id);
        $data = $this->validateProduct($request, partial: true);

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['name'], null, $product->id);
        } elseif (isset($data['slug']) && $data['slug'] !== $product->slug) {
            $data['slug'] = $this->uniqueSlug($data['name'] ?? $product->name, $data['slug'], $product->id);
        }

        $product->update($data);

        $this->rebuild->trigger('product-updated');

        return response()->json(['data' => new ProductDetailResource($product->fresh()->load(['lengths', 'images', 'category', 'suggestions']))]);
    }

    /**
     * DELETE /api/admin/products/{id}  (soft delete)
     */
    public function destroy(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete();

        $this->rebuild->trigger('product-deleted');

        return response()->json(null, 204);
    }

    /**
     * PUT /api/admin/products/{id}/lengths
     * Replace the entire offered length set.
     */
    public function replaceLengths(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $data = $request->validate([
            'lengths' => ['required', 'array', 'min:1'],
            'lengths.*.length_metres' => ['required', 'numeric', 'min:0.1', 'max:100'],
            'lengths.*.position' => ['required', 'integer', 'min:0'],
        ]);

        $product->lengths()->delete();

        foreach ($data['lengths'] as $row) {
            $product->lengths()->create([
                'length_metres' => $row['length_metres'],
                'position' => $row['position'],
                'is_active' => true,
            ]);
        }

        $this->rebuild->trigger('lengths-updated');

        return response()->json(['data' => new ProductDetailResource($product->fresh()->load(['lengths', 'images', 'category', 'suggestions']))]);
    }

    /**
     * POST /api/admin/products/{id}/images
     * Multipart upload of one or more image files.
     */
    public function uploadImages(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:8192'],
        ]);

        $hasPrimary = $product->images()->where('is_primary', true)->exists();
        $position = $product->images()->max('position') ?? -1;
        $created = [];

        foreach ($request->file('images') as $file) {
            $position++;
            [$path, $thumbPath] = $this->images->storeProductImage($file, $product->id);

            $image = $product->images()->create([
                'path' => $path,
                'thumb_path' => $thumbPath,
                'alt' => $request->input('alt', $product->name),
                'is_primary' => ! $hasPrimary,
                'position' => $position,
            ]);
            $hasPrimary = true;
            $created[] = $image;
        }

        $this->rebuild->trigger('images-uploaded');

        return response()->json(['data' => ProductImageResource::collection(collect($created))], 201);
    }

    /**
     * PATCH /api/admin/products/{pid}/images/{iid}
     */
    public function updateImage(Request $request, string $pid, string $iid): JsonResponse
    {
        $product = Product::findOrFail($pid);
        $image = $product->images()->findOrFail($iid);

        $data = $request->validate([
            'alt' => ['sometimes', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['is_primary'])) {
            $product->images()->update(['is_primary' => false]);
        }

        $image->update($data);

        $this->rebuild->trigger('image-updated');

        return response()->json(['data' => new ProductImageResource($image->fresh())]);
    }

    /**
     * DELETE /api/admin/products/{pid}/images/{iid}
     */
    public function deleteImage(string $pid, string $iid): JsonResponse
    {
        $product = Product::findOrFail($pid);
        $image = $product->images()->findOrFail($iid);

        $this->images->delete($image->path);
        $this->images->delete($image->thumb_path ?? '');
        $image->delete();

        // Promote another image to primary if needed.
        if (! $product->images()->where('is_primary', true)->exists()) {
            $product->images()->oldest()->first()?->update(['is_primary' => true]);
        }

        $this->rebuild->trigger('image-deleted');

        return response()->json(null, 204);
    }

    /**
     * PUT /api/admin/products/{id}/suggestions
     */
    public function replaceSuggestions(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $data = $request->validate([
            'suggested_product_ids' => ['required', 'array'],
            'suggested_product_ids.*' => ['uuid', Rule::exists('products', 'id')],
        ]);

        $sync = [];
        foreach ($data['suggested_product_ids'] as $pos => $sugId) {
            $sync[$sugId] = ['position' => $pos];
        }

        $product->suggestions()->sync($sync);
        $this->rebuild->trigger('suggestions-updated');

        return response()->json(['data' => new ProductDetailResource($product->fresh()->load(['lengths', 'images', 'category', 'suggestions']))]);
    }

    /**
     * GET /api/admin/products/{id}/suggestion-candidates
     * Returns products that pair well (complementary intended_use, or ?complementary=0 for all).
     */
    public function suggestionCandidates(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $query = Product::where('id', '!=', $id)
            ->active()
            ->with('primaryImage')
            ->orderBy('name');

        if ($request->boolean('complementary', true) && $product->intended_use) {
            $complementary = $product->intended_use->complementaryUses();
            if (! empty($complementary)) {
                $query->whereIn('intended_use', array_map(fn ($e) => $e->value, $complementary));
            }
        }

        $perPage = min((int) $request->integer('per_page', 20), 100);
        $results = $query->paginate($perPage);

        return (new PaginatedCollection($results, ProductListResource::class))->response();
    }

    // -------------------------------------------------------------------------

    private function validateProduct(Request $request, bool $partial = false): array
    {
        $sometimes = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$sometimes, 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => [$sometimes, 'uuid', Rule::exists('categories', 'id')],
            'intended_use' => [$sometimes, Rule::enum(IntendedUse::class)],
            'material' => ['nullable', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:100'],
            'pattern' => ['nullable', 'string', 'max:100'],
            'price_per_metre_paise' => [$sometimes, 'integer', 'min:1'],
            'compare_at_per_metre_paise' => ['nullable', 'integer', 'min:1'],
            'stock_metres' => [$sometimes, 'numeric', 'min:0'],
            'sku' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ]);
    }

    private function uniqueSlug(string $name, ?string $desired, ?string $excludeId = null): string
    {
        $base = Str::slug($desired ?? $name);
        $slug = $base;
        $i = 2;

        while (
            Product::withTrashed()
                ->where('slug', $slug)
                ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
