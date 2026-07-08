<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'parent_id' => $this->parent_id,
            'image_url' => $this->imageUrl(),
            'position' => $this->position,
            'is_active' => $this->is_active,
            'product_count' => $this->when(
                $this->products_count !== null,
                fn () => (int) $this->products_count
            ),
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'children' => self::collection($this->whenLoaded('children')),
        ];
    }

    private function imageUrl(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        return Str::startsWith($this->image_path, ['http://', 'https://'])
            ? $this->image_path
            : asset(Storage::url($this->image_path));
    }
}
