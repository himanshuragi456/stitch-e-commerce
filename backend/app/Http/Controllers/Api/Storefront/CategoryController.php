<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class CategoryController extends Controller
{
    /**
     * GET /api/categories  (?tree=1 for nested top-level categories)
     */
    public function index(Request $request): ResourceCollection
    {
        $query = Category::query()
            ->active()
            ->withCount(['products' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('position');

        if ($request->boolean('tree')) {
            $query->whereNull('parent_id')
                ->with(['children' => fn ($q) => $q->where('is_active', true)->orderBy('position')]);
        }

        return CategoryResource::collection($query->get());
    }

    /**
     * GET /api/categories/{category:slug}
     */
    public function show(Category $category): CategoryResource
    {
        abort_unless($category->is_active, 404);

        $category->loadCount(['products' => fn ($q) => $q->where('is_active', true)]);

        return new CategoryResource($category);
    }
}
