<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * Resource collection that trims Laravel's verbose pagination meta down to the
 * canonical contract shape: { current_page, last_page, per_page, total }.
 * See docs/50-API-CONTRACT.md §11.
 */
class PaginatedCollection extends ResourceCollection
{
    /**
     * @param  mixed  $resource
     * @param  class-string<JsonResource>  $collects
     */
    public function __construct($resource, string $collects)
    {
        $this->collects = $collects;

        parent::__construct($resource);
    }

    /**
     * @param  array<string, mixed>  $paginated
     * @param  array<string, mixed>  $default
     * @return array<string, mixed>
     */
    public function paginationInformation(Request $request, array $paginated, array $default): array
    {
        return [
            'meta' => [
                'current_page' => $paginated['current_page'],
                'last_page' => $paginated['last_page'],
                'per_page' => $paginated['per_page'],
                'total' => $paginated['total'],
            ],
        ];
    }
}
