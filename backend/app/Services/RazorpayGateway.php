<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Models\Order;
use Razorpay\Api\Api;

class RazorpayGateway implements PaymentGateway
{
    private Api $api;

    public function __construct()
    {
        $this->api = new Api(
            config('services.razorpay.key_id'),
            config('services.razorpay.key_secret'),
        );
    }

    /**
     * Create a Razorpay order and return the payload the frontend needs
     * to open the Razorpay checkout UI.
     *
     * @return array<string, mixed>
     */
    public function createOrder(Order $order): array
    {
        $rzpOrder = $this->api->order->create([
            'amount' => $order->total_paise,
            'currency' => 'INR',
            'receipt' => $order->order_number,
            'notes' => ['order_id' => $order->id],
        ]);

        return [
            'key_id' => config('services.razorpay.key_id'),
            'razorpay_order_id' => $rzpOrder->id,
            'amount_paise' => $order->total_paise,
            'currency' => 'INR',
        ];
    }

    /**
     * Verify payment signature using Razorpay's HMAC-SHA256 scheme.
     *
     * @param  array<string, string>  $payload
     */
    public function verifyPayment(array $payload): bool
    {
        try {
            $this->api->utility->verifyPaymentSignature([
                'razorpay_order_id' => $payload['gateway_order_id'],
                'razorpay_payment_id' => $payload['gateway_payment_id'],
                'razorpay_signature' => $payload['signature'],
            ]);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Verify the X-Razorpay-Signature header on webhook requests.
     */
    public function verifyWebhookSignature(string $rawBody, string $signature): bool
    {
        try {
            $this->api->utility->verifyWebhookSignature(
                $rawBody,
                $signature,
                config('services.razorpay.webhook_secret'),
            );

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
