<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Cart;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class CheckoutService
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly SettingService $settings,
    ) {}

    /**
     * Validate a coupon against a subtotal and return the discount amount.
     * Returns 0 if the coupon is not applicable; throws with a message if invalid.
     */
    public function validateCoupon(string $code, int $subtotalPaise): array
    {
        $coupon = Coupon::where('code', strtoupper(trim($code)))->first();

        if (! $coupon || ! $coupon->isValidNow()) {
            abort(422, 'Coupon is invalid or has expired.');
        }

        $discountPaise = $coupon->discountFor($subtotalPaise);

        if ($discountPaise === 0 && $coupon->min_order_paise && $subtotalPaise < $coupon->min_order_paise) {
            abort(422, 'Minimum order amount not met for this coupon.');
        }

        return [
            'valid' => true,
            'coupon' => $coupon,
            'discount_paise' => $discountPaise,
            'message' => 'Coupon applied: ₹'.number_format($discountPaise / 100, 0).' off',
        ];
    }

    /**
     * Create an order from the customer's cart, decrement stock, and return the
     * gateway payload needed to launch the Razorpay UI.
     *
     * All stock decrements happen inside a single DB transaction with row-level
     * locks to prevent overselling.
     *
     * @param  array<string, mixed>  $checkoutData
     * @return array{order: Order, gateway: array<string, mixed>}
     */
    public function createOrder(array $checkoutData, ?Customer $customer, ?Cart $cart): array
    {
        return DB::transaction(function () use ($checkoutData, $customer, $cart) {
            // Resolve cart items.
            if (! $cart || $cart->items->isEmpty()) {
                abort(422, 'Your cart is empty.');
            }

            // --- Build order items + validate + decrement stock ---
            $subtotalPaise = 0;
            $orderItemsData = [];

            foreach ($cart->items as $item) {
                /** @var Product $product */
                $product = Product::lockForUpdate()->findOrFail($item->product_id);

                abort_if(! $product->is_active, 422, "Product '{$product->name}' is no longer available.");

                // Verify length is still offered.
                $lengthOffered = $product->lengths()
                    ->where('length_metres', $item->length_metres)
                    ->where('is_active', true)
                    ->exists();

                abort_unless($lengthOffered, 422, "Selected length for '{$product->name}' is no longer available.");

                $metresNeeded = (float) $item->length_metres * $item->quantity;
                abort_if(
                    (float) $product->stock_metres < $metresNeeded,
                    422,
                    "Not enough stock for '{$product->name}'. Only {$product->stock_metres} m left."
                );

                // Decrement stock.
                $product->decrement('stock_metres', $metresNeeded);

                $unitPricePaise = $product->priceForLength($item->length_metres);
                $lineTotalPaise = $unitPricePaise * $item->quantity;
                $subtotalPaise += $lineTotalPaise;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'length_metres' => $item->length_metres,
                    'price_per_metre_paise' => $product->price_per_metre_paise,
                    'sku' => $product->sku,
                    'unit_price_paise' => $unitPricePaise,
                    'quantity' => $item->quantity,
                    'line_total_paise' => $lineTotalPaise,
                ];
            }

            // --- Shipping ---
            $freeThreshold = (int) $this->settings->get('shipping.free_threshold_paise', 0);
            $flatRate = (int) $this->settings->get('shipping.flat_rate_paise', 0);
            $shippingPaise = ($freeThreshold > 0 && $subtotalPaise >= $freeThreshold) ? 0 : $flatRate;

            // --- Coupon ---
            $discountPaise = 0;
            $couponId = null;

            if (! empty($checkoutData['coupon_code'])) {
                $result = $this->validateCoupon($checkoutData['coupon_code'], $subtotalPaise);
                $discountPaise = $result['discount_paise'];
                $couponId = $result['coupon']->id;
                // Increment usage (inside the same transaction).
                $result['coupon']->increment('used_count');
            }

            $totalPaise = max(0, $subtotalPaise + $shippingPaise - $discountPaise);

            // --- Payment method: 'razorpay' (pay online) or 'cod' (cash on delivery) ---
            $paymentMethod = $checkoutData['payment_method'] ?? 'razorpay';

            // --- Create the order ---
            $order = Order::create([
                'order_number' => $this->generateOrderNumber(),
                'customer_id' => $customer?->id,
                'status' => OrderStatus::Pending,
                'subtotal_paise' => $subtotalPaise,
                'shipping_paise' => $shippingPaise,
                'discount_paise' => $discountPaise,
                'total_paise' => $totalPaise,
                'coupon_id' => $couponId,
                'customer_email' => $checkoutData['email'],
                'customer_phone' => $checkoutData['phone'] ?? null,
                'notes' => $checkoutData['notes'] ?? null,
                'shipping_address' => $checkoutData['shipping_address'],
                'billing_address' => $checkoutData['billing_address'] ?? null,
                'payment_status' => PaymentStatus::Unpaid,
                'payment_method' => $paymentMethod,
                'placed_at' => Carbon::now(),
            ]);

            foreach ($orderItemsData as $itemData) {
                OrderItem::create(['order_id' => $order->id, ...$itemData]);
            }

            // Clear the cart — the order now owns the reserved stock.
            $cart->items()->delete();

            if ($paymentMethod === 'cod') {
                // Cash on delivery: no gateway. The order is placed immediately as
                // pending/unpaid; the team collects on delivery. Record a payment
                // row so admin/refund flows have something to reference.
                Payment::create([
                    'order_id' => $order->id,
                    'gateway' => 'cod',
                    'amount_paise' => $totalPaise,
                    'status' => 'pending',
                ]);

                $this->sendConfirmationEmail($order->load('items'));

                return ['order' => $order->load('items'), 'gateway' => null];
            }

            // --- Online payment: create a Razorpay order ---
            $gatewayPayload = $this->gateway->createOrder($order);

            // Store the gateway order ID for later verification.
            Payment::create([
                'order_id' => $order->id,
                'gateway' => 'razorpay',
                'gateway_order_id' => $gatewayPayload['razorpay_order_id'],
                'amount_paise' => $totalPaise,
                'status' => 'created',
            ]);

            return ['order' => $order->load('items'), 'gateway' => $gatewayPayload];
        });
    }

    /**
     * Verify a Razorpay callback and mark the order as paid.
     * Idempotent — safe to call multiple times for the same payment.
     *
     * @param  array<string, string>  $payload
     */
    public function verifyPayment(array $payload): Order
    {
        return DB::transaction(function () use ($payload) {
            $payment = Payment::where('gateway_order_id', $payload['razorpay_order_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $order = Order::lockForUpdate()->findOrFail($payment->order_id);

            // Already marked paid — idempotent.
            if ($order->payment_status === PaymentStatus::Paid) {
                return $order->load('items');
            }

            abort_unless(
                $this->gateway->verifyPayment([
                    'gateway_order_id' => $payload['razorpay_order_id'],
                    'gateway_payment_id' => $payload['razorpay_payment_id'],
                    'signature' => $payload['razorpay_signature'],
                ]),
                422,
                'Payment verification failed.'
            );

            $payment->update([
                'gateway_payment_id' => $payload['razorpay_payment_id'],
                'gateway_signature' => $payload['razorpay_signature'],
                'status' => 'captured',
            ]);

            $order->update([
                'status' => OrderStatus::Paid,
                'payment_status' => PaymentStatus::Paid,
            ]);

            $this->sendConfirmationEmail($order->load('items'));

            return $order->load('items');
        });
    }

    /**
     * Handle a Razorpay webhook event (payment.captured / payment.failed).
     * Idempotent — duplicate delivery is safe.
     *
     * @param  array<string, mixed>  $event
     */
    public function handleWebhookEvent(array $event): void
    {
        $eventName = $event['event'] ?? '';

        if ($eventName === 'payment.captured') {
            $paymentData = $event['payload']['payment']['entity'] ?? [];
            $rzpOrderId = $paymentData['order_id'] ?? null;
            $rzpPaymentId = $paymentData['id'] ?? null;

            if (! $rzpOrderId || ! $rzpPaymentId) {
                return;
            }

            DB::transaction(function () use ($rzpOrderId, $rzpPaymentId, $paymentData) {
                $payment = Payment::where('gateway_order_id', $rzpOrderId)
                    ->lockForUpdate()
                    ->first();

                if (! $payment) {
                    return;
                }

                $order = Order::lockForUpdate()->find($payment->order_id);
                if (! $order || $order->payment_status === PaymentStatus::Paid) {
                    return;
                }

                $payment->update([
                    'gateway_payment_id' => $rzpPaymentId,
                    'status' => 'captured',
                    'raw_payload' => $paymentData,
                ]);

                $order->update([
                    'status' => OrderStatus::Paid,
                    'payment_status' => PaymentStatus::Paid,
                ]);

                $this->sendConfirmationEmail($order->load('items'));
            });
        }

        if ($eventName === 'payment.failed') {
            $paymentData = $event['payload']['payment']['entity'] ?? [];
            $rzpOrderId = $paymentData['order_id'] ?? null;

            if (! $rzpOrderId) {
                return;
            }

            DB::transaction(function () use ($rzpOrderId, $paymentData) {
                $payment = Payment::where('gateway_order_id', $rzpOrderId)
                    ->lockForUpdate()
                    ->first();

                if (! $payment) {
                    return;
                }

                $payment->update(['status' => 'failed', 'raw_payload' => $paymentData]);
            });
        }
    }

    private function generateOrderNumber(): string
    {
        $year = Carbon::now()->year;
        $sequence = str_pad((string) (Order::whereYear('created_at', $year)->count() + 1), 5, '0', STR_PAD_LEFT);

        return "SKC-{$year}-{$sequence}";
    }

    private function sendConfirmationEmail(Order $order): void
    {
        // Email is logged locally (MAIL_MAILER=log). Proper Mailable can be
        // wired up once the email template is designed (task 4.8 / phase 7).
        try {
            Mail::raw(
                "Order {$order->order_number} confirmed. Total: ₹".number_format($order->total_paise / 100, 0),
                function ($m) use ($order) {
                    $m->to($order->customer_email)
                        ->subject("Your order {$order->order_number} is confirmed — Shree Krishna Collection");
                }
            );
        } catch (\Throwable) {
            // Never let a mail failure break the payment flow.
        }
    }
}
