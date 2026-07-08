<?php

namespace App\Contracts;

use App\Models\Order;

interface PaymentGateway
{
    /**
     * Create a gateway order for the given app order.
     * Returns the gateway-specific payload the frontend needs to launch the payment UI.
     *
     * @return array<string, mixed>
     */
    public function createOrder(Order $order): array;

    /**
     * Verify a completed payment.
     * Returns true if the signature/ID checks pass; false otherwise.
     *
     * @param  array<string, string>  $payload  keys: gateway_order_id, gateway_payment_id, signature
     */
    public function verifyPayment(array $payload): bool;

    /**
     * Verify the signature on an inbound webhook payload.
     *
     * @param  string  $rawBody  raw request body bytes
     * @param  string  $signature  value from the gateway webhook header
     */
    public function verifyWebhookSignature(string $rawBody, string $signature): bool;
}
