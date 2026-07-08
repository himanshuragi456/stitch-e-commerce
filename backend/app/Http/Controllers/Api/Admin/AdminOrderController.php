<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaginatedCollection;
use App\Models\Order;
use App\Services\ShippingLabelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    public function __construct(
        private readonly ShippingLabelService $labels,
    ) {}

    /**
     * GET /api/admin/orders
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'payment_status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Order::with(['customer', 'items'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status'))
            )
            ->when($request->filled('payment_status'), fn ($q) => $q->where('payment_status', $request->input('payment_status'))
            )
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->input('search');
                $q->where(function ($inner) use ($term) {
                    $inner->where('order_number', 'like', "%{$term}%")
                        ->orWhere('customer_email', 'like', "%{$term}%")
                        ->orWhere('customer_phone', 'like', "%{$term}%");
                });
            })
            ->when($request->filled('from'), fn ($q) => $q->whereDate('placed_at', '>=', $request->input('from'))
            )
            ->when($request->filled('to'), fn ($q) => $q->whereDate('placed_at', '<=', $request->input('to'))
            )
            ->orderByDesc('placed_at');

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        return (new PaginatedCollection($query->paginate($perPage), OrderResource::class))->response();
    }

    /**
     * GET /api/admin/orders/{id}
     */
    public function show(string $id): JsonResponse
    {
        $order = Order::with(['customer', 'items', 'coupon'])->findOrFail($id);

        return response()->json(['data' => new OrderResource($order)]);
    }

    /**
     * PATCH /api/admin/orders/{id}/status
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
        ]);

        $order = Order::findOrFail($id);
        $newStatus = OrderStatus::from($data['status']);

        if (! $order->status->canTransitionTo($newStatus)) {
            return response()->json([
                'message' => "Cannot transition from '{$order->status->value}' to '{$newStatus->value}'.",
                'allowed' => array_map(fn ($s) => $s->value, $order->status->allowedTransitions()),
            ], 422);
        }

        $order->update(['status' => $newStatus]);

        return response()->json(['data' => new OrderResource($order->fresh()->load('items'))]);
    }

    /**
     * PATCH /api/admin/orders/{id}/notes
     */
    public function updateNotes(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = Order::findOrFail($id);
        $order->update(['notes' => $data['notes'] ?? null]);

        return response()->json(['data' => new OrderResource($order->fresh()->load('items'))]);
    }

    /**
     * POST /api/admin/orders/{id}/refund
     * Admin-only; marks order as refunded (no actual gateway call — manual process).
     */
    public function refund(Request $request, string $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        if (! $order->status->canTransitionTo(OrderStatus::Refunded)) {
            return response()->json([
                'message' => "Order cannot be refunded from status '{$order->status->value}'.",
            ], 422);
        }

        $order->update([
            'status' => OrderStatus::Refunded,
            'payment_status' => PaymentStatus::Refunded,
        ]);

        return response()->json(['data' => new OrderResource($order->fresh()->load('items'))]);
    }

    /**
     * GET /api/admin/orders/{id}/label
     * Returns a single-page PDF shipping label.
     */
    public function label(string $id): Response
    {
        $order = Order::with('items')->findOrFail($id);

        $pdf = $this->labels->single($order);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="label-'.$order->order_number.'.pdf"',
        ]);
    }

    /**
     * POST /api/admin/orders/labels/batch
     * Returns a multi-page PDF with one label per order.
     */
    public function labelBatch(Request $request): Response
    {
        $data = $request->validate([
            'order_ids' => ['required', 'array', 'min:1', 'max:50'],
            'order_ids.*' => ['uuid'],
        ]);

        $orders = Order::with('items')
            ->whereIn('id', $data['order_ids'])
            ->get();

        if ($orders->isEmpty()) {
            abort(422, 'No valid orders found for the given IDs.');
        }

        $pdf = $this->labels->batch($orders);

        $filename = 'labels-batch-'.now()->format('Ymd-His').'.pdf';

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$filename}\"",
        ]);
    }
}
