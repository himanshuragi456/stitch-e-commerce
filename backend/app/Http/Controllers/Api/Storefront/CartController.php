<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartResource;
use App\Models\Customer;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly CartService $cartService) {}

    /**
     * GET /api/cart
     * Return the current cart (empty cart if none exists yet).
     */
    public function show(Request $request): JsonResponse
    {
        $cart = $this->cartService->resolveCart($request, createIfMissing: false);

        if (! $cart) {
            return response()->json([
                'data' => [
                    'id' => null,
                    'token' => null,
                    'items' => [],
                    'subtotal_paise' => 0,
                    'item_count' => 0,
                ],
            ]);
        }

        $cart = $this->cartService->loadCart($cart);

        return response()->json(['data' => new CartResource($cart)]);
    }

    /**
     * POST /api/cart/items
     * Body: { product_id, length_metres, quantity }
     */
    public function addItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'length_metres' => ['required', 'numeric', 'min:0.01'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $cart = $this->cartService->resolveCart($request, createIfMissing: true);

        if (! $cart) {
            return response()->json(['message' => 'Could not resolve cart. Provide an X-Cart-Token header or log in.'], 422);
        }

        $cart = $this->cartService->addItem(
            $cart,
            $data['product_id'],
            (string) number_format((float) $data['length_metres'], 2, '.', ''),
            (int) $data['quantity'],
        );

        return response()->json(['data' => new CartResource($cart)], 201);
    }

    /**
     * PATCH /api/cart/items/{id}
     * Body: { quantity }  — quantity 0 removes the item.
     */
    public function updateItem(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:0'],
        ]);

        $cart = $this->cartService->resolveCart($request, createIfMissing: false);
        abort_unless($cart, 404, 'Cart not found.');

        $cart = $this->cartService->updateItem($cart, $id, (int) $data['quantity']);

        return response()->json(['data' => new CartResource($cart)]);
    }

    /**
     * DELETE /api/cart/items/{id}
     */
    public function removeItem(Request $request, string $id): JsonResponse
    {
        $cart = $this->cartService->resolveCart($request, createIfMissing: false);
        abort_unless($cart, 404, 'Cart not found.');

        $cart = $this->cartService->removeItem($cart, $id);

        return response()->json(['data' => new CartResource($cart)]);
    }

    /**
     * POST /api/cart/merge
     * Body: { guest_cart_token }
     * Merges a guest cart into the authenticated customer's cart.
     */
    public function merge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'guest_cart_token' => ['required', 'string'],
        ]);

        /** @var Customer $customer */
        $customer = $request->user('customer');
        abort_unless($customer, 401, 'Authentication required.');

        $cart = $this->cartService->mergeGuestCart($customer, $data['guest_cart_token']);

        return response()->json(['data' => new CartResource($cart)]);
    }
}
