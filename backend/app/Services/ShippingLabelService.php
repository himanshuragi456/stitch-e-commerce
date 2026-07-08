<?php

namespace App\Services;

use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

class ShippingLabelService
{
    /**
     * Generate a PDF shipping label for a single order.
     * Returns raw PDF bytes.
     */
    public function single(Order $order): string
    {
        $order->loadMissing('items');

        $pdf = Pdf::loadView('labels.shipping', [
            'orders' => collect([$order]),
        ])->setPaper([0, 0, 288, 432], 'portrait'); // 4×6 inches in points

        return $pdf->output();
    }

    /**
     * Generate a multi-page PDF for a batch of orders.
     * Each order gets one page (4×6 inch sticker).
     *
     * @param  Collection<int, Order>|SupportCollection<int, Order>  $orders
     */
    public function batch(Collection|SupportCollection $orders): string
    {
        $orders->each->loadMissing('items');

        $pdf = Pdf::loadView('labels.shipping', [
            'orders' => $orders,
        ])->setPaper([0, 0, 288, 432], 'portrait');

        return $pdf->output();
    }
}
