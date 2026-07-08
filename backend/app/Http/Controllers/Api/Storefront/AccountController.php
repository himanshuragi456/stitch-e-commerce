<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\AddressResource;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaginatedCollection;
use App\Models\Address;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AccountController extends Controller
{
    // -------------------------------------------------------------------------
    // Profile
    // -------------------------------------------------------------------------

    /**
     * PATCH /api/account/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
        ]);

        $customer->update($data);

        return response()->json(['data' => new CustomerResource($customer->fresh())]);
    }

    /**
     * PATCH /api/account/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        if (! Hash::check($data['current_password'], $customer->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $customer->update(['password' => Hash::make($data['password'])]);

        return response()->json(['message' => 'Password updated.']);
    }

    // -------------------------------------------------------------------------
    // Addresses
    // -------------------------------------------------------------------------

    /**
     * GET /api/account/addresses
     */
    public function addresses(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        return response()->json([
            'data' => AddressResource::collection(
                $customer->addresses()->orderByDesc('is_default')->orderBy('created_at')->get()
            ),
        ]);
    }

    /**
     * POST /api/account/addresses
     */
    public function storeAddress(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $data = $this->validateAddress($request);

        if ($data['is_default'] ?? false) {
            $customer->addresses()->update(['is_default' => false]);
        }

        $address = $customer->addresses()->create($data);

        // First address is always default.
        if ($customer->addresses()->count() === 1) {
            $address->update(['is_default' => true]);
        }

        return response()->json(['data' => new AddressResource($address)], 201);
    }

    /**
     * PATCH /api/account/addresses/{id}
     */
    public function updateAddress(Request $request, string $id): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $address = $customer->addresses()->findOrFail($id);
        $data = $this->validateAddress($request, partial: true);

        if (! empty($data['is_default'])) {
            $customer->addresses()->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json(['data' => new AddressResource($address->fresh())]);
    }

    /**
     * DELETE /api/account/addresses/{id}
     */
    public function deleteAddress(Request $request, string $id): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $customer->addresses()->findOrFail($id)->delete();

        // Promote another address to default if the deleted one was default.
        if (! $customer->addresses()->where('is_default', true)->exists()) {
            $customer->addresses()->oldest()->first()?->update(['is_default' => true]);
        }

        return response()->json(null, 204);
    }

    // -------------------------------------------------------------------------
    // Orders
    // -------------------------------------------------------------------------

    /**
     * GET /api/account/orders
     */
    public function orders(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $perPage = min(max((int) $request->integer('per_page', 15), 1), 50);

        $orders = $customer->orders()
            ->with('items')
            ->orderByDesc('placed_at')
            ->paginate($perPage);

        return (new PaginatedCollection($orders, OrderResource::class))->response();
    }

    /**
     * GET /api/account/orders/{id}
     */
    public function showOrder(Request $request, string $id): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user('customer');

        $order = $customer->orders()->with('items')->findOrFail($id);

        return response()->json(['data' => new OrderResource($order)]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** @return array<string, mixed> */
    private function validateAddress(Request $request, bool $partial = false): array
    {
        $sometimes = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'label' => ['nullable', 'string', 'max:50'],
            'name' => [$sometimes, 'string', 'max:100'],
            'phone' => [$sometimes, 'string', 'max:20'],
            'line1' => [$sometimes, 'string', 'max:255'],
            'line2' => ['nullable', 'string', 'max:255'],
            'city' => [$sometimes, 'string', 'max:100'],
            'state' => [$sometimes, 'string', 'max:100'],
            'pincode' => [$sometimes, 'string', 'max:10'],
            'country' => ['nullable', 'string', 'size:2'],
            'is_default' => ['sometimes', 'boolean'],
        ]);
    }
}
