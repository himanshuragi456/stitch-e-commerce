<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * GET /api/admin/dashboard
     */
    public function index(): JsonResponse
    {
        $today = now()->startOfDay();
        $last30 = now()->subDays(29)->startOfDay();

        // ── KPIs ─────────────────────────────────────────────────────────────
        $revenue30 = Order::where('placed_at', '>=', $last30)
            ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Refunded->value])
            ->sum('total_paise');

        $ordersToday = Order::whereDate('placed_at', $today)->count();
        $ordersTotal = Order::count();

        $customerCount = Customer::count();

        $pendingOrders = Order::where('status', OrderStatus::Pending)->count();
        $processingOrders = Order::where('status', OrderStatus::Processing)->count();

        // ── Sales series (last 30 days, daily totals) ─────────────────────────
        $salesSeries = Order::select(
            DB::raw('DATE(placed_at) as date'),
            DB::raw('COUNT(*) as order_count'),
            DB::raw('SUM(total_paise) as revenue_paise')
        )
            ->where('placed_at', '>=', $last30)
            ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Refunded->value])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // ── Low stock ─────────────────────────────────────────────────────────
        $lowStockThreshold = config('skc.low_stock_threshold', 5);
        $lowStock = Product::active()
            ->where('stock_metres', '<=', $lowStockThreshold)
            ->with('primaryImage')
            ->orderBy('stock_metres')
            ->take(10)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'stock_metres' => $p->stock_metres,
                'primary_image_url' => $p->primaryImage?->url,
            ]);

        // ── Recent orders ─────────────────────────────────────────────────────
        $recentOrders = Order::with(['items'])
            ->orderByDesc('placed_at')
            ->take(10)
            ->get();

        return response()->json([
            'kpis' => [
                'revenue_last_30_days_paise' => (int) $revenue30,
                'orders_today' => $ordersToday,
                'orders_total' => $ordersTotal,
                'customers_total' => $customerCount,
                'pending_orders' => $pendingOrders,
                'processing_orders' => $processingOrders,
            ],
            'sales_series' => $salesSeries,
            'low_stock' => $lowStock,
            'recent_orders' => OrderResource::collection($recentOrders),
        ]);
    }
}
