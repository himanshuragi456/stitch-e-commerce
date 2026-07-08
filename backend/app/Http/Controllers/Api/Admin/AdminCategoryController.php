<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\ImageService;
use App\Services\StorefrontRebuildService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminCategoryController extends Controller
{
    public function __construct(
        private readonly ImageService $images,
        private readonly StorefrontRebuildService $rebuild,
    ) {}

    /**
     * GET /api/admin/categories
     */
    public function index(): JsonResponse
    {
        $categories = Category::withTrashed()
            ->with('children')
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => CategoryResource::collection($categories)]);
    }

    /**
     * POST /api/admin/categories
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateCategory($request);
        $data['slug'] = $this->uniqueSlug($data['name'], $data['slug'] ?? null);

        if ($request->hasFile('image')) {
            $data['image_path'] = $this->storeCategoryImage($request, $data['slug']);
        }

        $category = Category::create($data);
        $this->rebuild->trigger('category-created');

        return response()->json(['data' => new CategoryResource($category)], 201);
    }

    /**
     * PATCH /api/admin/categories/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $category = Category::withTrashed()->findOrFail($id);
        $data = $this->validateCategory($request, partial: true);

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['name'], null, $category->id);
        }

        if ($request->hasFile('image')) {
            if ($category->image_path) {
                $this->images->delete($category->image_path);
            }
            $data['image_path'] = $this->storeCategoryImage($request, $data['slug'] ?? $category->slug);
        }

        $category->update($data);
        $this->rebuild->trigger('category-updated');

        return response()->json(['data' => new CategoryResource($category->fresh())]);
    }

    /**
     * DELETE /api/admin/categories/{id}  (soft delete)
     */
    public function destroy(string $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->delete();

        $this->rebuild->trigger('category-deleted');

        return response()->json(null, 204);
    }

    // -------------------------------------------------------------------------

    private function validateCategory(Request $request, bool $partial = false): array
    {
        $sometimes = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$sometimes, 'string', 'max:100'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'uuid', Rule::exists('categories', 'id')],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'image' => ['sometimes', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);
    }

    private function uniqueSlug(string $name, ?string $desired, ?string $excludeId = null): string
    {
        $base = Str::slug($desired ?? $name);
        $slug = $base;
        $i = 2;

        while (
            Category::withTrashed()
                ->where('slug', $slug)
                ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function storeCategoryImage(Request $request, string $slug): string
    {
        [$path] = $this->images->storeProductImage($request->file('image'), "categories/{$slug}");

        return $path;
    }
}
