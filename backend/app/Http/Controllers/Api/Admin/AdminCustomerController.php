<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaginatedCollection;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    /**
     * GET /api/admin/customers
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Customer::withTrashed()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->input('search');
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%");
                });
            })
            ->orderByDesc('created_at');

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        return (new PaginatedCollection($query->paginate($perPage), CustomerResource::class))->response();
    }

    /**
     * GET /api/admin/customers/{id}
     */
    public function show(string $id): JsonResponse
    {
        $customer = Customer::withTrashed()->findOrFail($id);

        $orders = $customer->orders()->with('items')->orderByDesc('placed_at')->take(10)->get();

        return response()->json([
            'data' => new CustomerResource($customer),
            'recent_orders' => OrderResource::collection($orders),
        ]);
    }
}
