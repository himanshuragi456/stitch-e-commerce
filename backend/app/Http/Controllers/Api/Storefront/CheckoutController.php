<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Services\CartService;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkout,
        private readonly CartService $cart,
    ) {}

    /**
     * POST /api/checkout
     * Creates an order from the current cart and returns a Razorpay order payload.
     */
    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'shipping_address' => ['required', 'array'],
            'shipping_address.name' => ['required', 'string', 'max:100'],
            'shipping_address.phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'shipping_address.line1' => ['required', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required', 'string', 'max:100'],
            'shipping_address.state' => ['required', 'string', 'max:100'],
            'shipping_address.pincode' => ['required', 'string', 'max:10'],
            'shipping_address.country' => ['nullable', 'string', 'size:2'],
            'billing_address' => ['nullable', 'array'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'cart_token' => ['nullable', 'string'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', 'in:razorpay,cod'],
        ]);

        // Resolve cart: prefer auth customer, then explicit cart_token in body,
        // then X-Cart-Token header.
        if (! empty($data['cart_token'])) {
            $request->headers->set('X-Cart-Token', $data['cart_token']);
        }

        /** @var Customer|null $customer */
        $customer = $request->user('customer');
        $cartModel = $this->cart->resolveCart($request, createIfMissing: false);

        if ($cartModel) {
            $cartModel = $this->cart->loadCart($cartModel);
        }

        $data['shipping_address']['country'] ??= 'IN';

        $result = $this->checkout->createOrder($data, $customer, $cartModel);

        return response()->json([
            'data' => [
                'order' => new OrderResource($result['order']),
                'razorpay' => $result['gateway'],
            ],
        ], 201);
    }

    /**
     * POST /api/checkout/verify
     * Verifies a Razorpay payment callback and marks the order as paid.
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'uuid', 'exists:orders,id'],
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
        ]);

        $order = $this->checkout->verifyPayment([
            'razorpay_order_id' => $data['razorpay_order_id'],
            'razorpay_payment_id' => $data['razorpay_payment_id'],
            'razorpay_signature' => $data['razorpay_signature'],
        ]);

        return response()->json(['data' => new OrderResource($order)]);
    }

    /**
     * POST /api/webhooks/razorpay
     * Receives and processes Razorpay webhook events.
     * The route must be CSRF-exempt (handled in bootstrap/app.php middleware config).
     */
    public function webhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        $signature = $request->header('X-Razorpay-Signature', '');

        // In production, always verify the webhook signature. Keys are empty in
        // local dev — skip verification only when the secret is not configured.
        $webhookSecret = config('services.razorpay.webhook_secret');
        if ($webhookSecret) {
            abort_unless(
                app(PaymentGateway::class)->verifyWebhookSignature($rawBody, $signature),
                401,
                'Invalid webhook signature.'
            );
        }

        $event = $request->json()->all();
        $this->checkout->handleWebhookEvent($event);

        return response()->json(['status' => 'ok']);
    }

    /**
     * GET /api/orders/{number}/public
     * Allows a confirmation page to look up an order by order_number.
     * Rate-limited; requires the email to match (or a recent session cookie).
     */
    public function publicShow(Request $request, string $number): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $order = Order::where('order_number', $number)
            ->where('customer_email', $data['email'])
            ->with('items')
            ->firstOrFail();

        return response()->json(['data' => new OrderResource($order)]);
    }

    /**
     * POST /api/coupons/validate
     * Validates a coupon code against the current cart subtotal.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'cart_token' => ['nullable', 'string'],
        ]);

        if (! empty($data['cart_token'])) {
            $request->headers->set('X-Cart-Token', $data['cart_token']);
        }

        $cartModel = $this->cart->resolveCart($request, createIfMissing: false);
        $subtotalPaise = 0;

        if ($cartModel) {
            $cartModel = $this->cart->loadCart($cartModel);
            $subtotalPaise = $cartModel->items->sum(fn ($i) => $i->lineTotalPaise());
        }

        $result = $this->checkout->validateCoupon($data['code'], $subtotalPaise);

        return response()->json([
            'data' => [
                'valid' => true,
                'discount_paise' => $result['discount_paise'],
                'message' => $result['message'],
            ],
        ]);
    }
}
