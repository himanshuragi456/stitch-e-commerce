<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductLength;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    /**
     * Resolve (or lazily create) the cart for this request.
     * Logged-in customer → use/create their customer cart.
     * Guest → use/create the cart identified by X-Cart-Token header.
     */
    public function resolveCart(Request $request, bool $createIfMissing = true): ?Cart
    {
        /** @var Customer|null $customer */
        $customer = $request->user('customer');

        if ($customer) {
            $cart = Cart::firstWhere('customer_id', $customer->id);
            if (! $cart && $createIfMissing) {
                $cart = Cart::create(['customer_id' => $customer->id]);
            }

            return $cart;
        }

        $token = trim($request->header('X-Cart-Token', '') ?? '');
        if (! $token) {
            return $createIfMissing ? null : null;
        }

        $cart = Cart::firstWhere('token', $token);
        if (! $cart && $createIfMissing) {
            $cart = Cart::create(['token' => $token]);
        }

        return $cart;
    }

    /**
     * Add (or increment) an item.
     *
     * Validates:
     * - Product exists, is active.
     * - length_metres is in the product's offered lengths.
     * - After adding, total metres consumed ≤ stock_metres.
     *
     * Returns the updated Cart (items loaded).
     *
     * @throws ValidationException
     */
    public function addItem(Cart $cart, string $productId, string $lengthMetres, int $quantity): Cart
    {
        return DB::transaction(function () use ($cart, $productId, $lengthMetres, $quantity) {
            /** @var Product $product */
            $product = Product::lockForUpdate()->findOrFail($productId);

            abort_if(! $product->is_active, 422, 'Product is not available.');

            // Verify length is in the offered set.
            $offeredLength = ProductLength::where('product_id', $product->id)
                ->where('length_metres', $lengthMetres)
                ->where('is_active', true)
                ->first();

            abort_unless($offeredLength, 422, 'The selected length is not available for this product.');

            // Current metres already in cart for this product (all lines).
            $existingMetres = $cart->items()
                ->where('product_id', $product->id)
                ->selectRaw('SUM(length_metres * quantity) as total')
                ->value('total') ?? 0.0;

            $additionalMetres = (float) $lengthMetres * $quantity;
            $totalMetres = (float) $existingMetres + $additionalMetres;

            abort_if(
                $totalMetres > (float) $product->stock_metres,
                422,
                "Not enough stock. Only {$product->stock_metres} m available."
            );

            $existingItem = $cart->items()
                ->where('product_id', $product->id)
                ->where('length_metres', $lengthMetres)
                ->first();

            if ($existingItem) {
                $existingItem->increment('quantity', $quantity);
            } else {
                CartItem::create([
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'length_metres' => $lengthMetres,
                    'quantity' => $quantity,
                ]);
            }

            return $this->loadCart($cart);
        });
    }

    /**
     * Update the quantity of a cart item.
     * quantity = 0 removes the item.
     *
     * @throws ModelNotFoundException
     */
    public function updateItem(Cart $cart, string $itemId, int $quantity): Cart
    {
        return DB::transaction(function () use ($cart, $itemId, $quantity) {
            $item = $cart->items()->findOrFail($itemId);

            if ($quantity <= 0) {
                $item->delete();

                return $this->loadCart($cart);
            }

            // Re-check stock for the new quantity.
            /** @var Product $product */
            $product = Product::lockForUpdate()->findOrFail($item->product_id);

            // Metres consumed by other lines for this product.
            $otherMetres = $cart->items()
                ->where('product_id', $product->id)
                ->where('id', '!=', $item->id)
                ->selectRaw('SUM(length_metres * quantity) as total')
                ->value('total') ?? 0.0;

            $newMetres = (float) $item->length_metres * $quantity + (float) $otherMetres;

            abort_if(
                $newMetres > (float) $product->stock_metres,
                422,
                "Not enough stock. Only {$product->stock_metres} m available."
            );

            $item->update(['quantity' => $quantity]);

            return $this->loadCart($cart);
        });
    }

    /**
     * Remove a single item from the cart.
     */
    public function removeItem(Cart $cart, string $itemId): Cart
    {
        $cart->items()->findOrFail($itemId)->delete();

        return $this->loadCart($cart);
    }

    /**
     * Merge a guest cart into a customer cart after login.
     * Guest items are moved; conflicts (same product + length) are summed
     * up to the available stock, then the guest cart is deleted.
     */
    public function mergeGuestCart(Customer $customer, string $guestToken): Cart
    {
        return DB::transaction(function () use ($customer, $guestToken) {
            $guestCart = Cart::firstWhere('token', $guestToken);
            if (! $guestCart) {
                return $this->resolveCart(request(), true) ?? Cart::create(['customer_id' => $customer->id]);
            }

            $customerCart = Cart::firstOrCreate(['customer_id' => $customer->id]);

            foreach ($guestCart->items()->with('product')->get() as $guestItem) {
                $product = Product::lockForUpdate()->find($guestItem->product_id);
                if (! $product || ! $product->is_active) {
                    continue;
                }

                $existingItem = $customerCart->items()
                    ->where('product_id', $guestItem->product_id)
                    ->where('length_metres', $guestItem->length_metres)
                    ->first();

                $currentMetres = $customerCart->items()
                    ->where('product_id', $guestItem->product_id)
                    ->selectRaw('SUM(length_metres * quantity) as total')
                    ->value('total') ?? 0.0;

                $addQty = $guestItem->quantity;
                $addMetres = (float) $guestItem->length_metres * $addQty;

                // Clamp to available stock.
                if ((float) $currentMetres + $addMetres > (float) $product->stock_metres) {
                    $maxMetres = max(0, (float) $product->stock_metres - (float) $currentMetres);
                    $addQty = (int) floor($maxMetres / (float) $guestItem->length_metres);
                }

                if ($addQty <= 0) {
                    continue;
                }

                if ($existingItem) {
                    $existingItem->increment('quantity', $addQty);
                } else {
                    CartItem::create([
                        'cart_id' => $customerCart->id,
                        'product_id' => $guestItem->product_id,
                        'length_metres' => $guestItem->length_metres,
                        'quantity' => $addQty,
                    ]);
                }
            }

            $guestCart->delete();

            return $this->loadCart($customerCart);
        });
    }

    /** Reload the cart with the associations needed by CartResource. */
    public function loadCart(Cart $cart): Cart
    {
        $cart->load([
            'items' => fn ($q) => $q->with([
                'product' => fn ($q) => $q->with('images'),
            ]),
        ]);

        return $cart;
    }
}
