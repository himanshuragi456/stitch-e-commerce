<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCouponController extends Controller
{
    /**
     * GET /api/admin/coupons
     */
    public function index(): JsonResponse
    {
        $coupons = Coupon::orderByDesc('created_at')->get();

        return response()->json(['data' => $coupons]);
    }

    /**
     * GET /api/admin/coupons/{id}
     */
    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => Coupon::findOrFail($id)]);
    }

    /**
     * POST /api/admin/coupons
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateCoupon($request);
        $data['code'] = strtoupper($data['code']);

        $coupon = Coupon::create($data);

        return response()->json(['data' => $coupon], 201);
    }

    /**
     * PATCH /api/admin/coupons/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);
        $data = $this->validateCoupon($request, partial: true, excludeId: $id);

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $coupon->update($data);

        return response()->json(['data' => $coupon->fresh()]);
    }

    /**
     * DELETE /api/admin/coupons/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        Coupon::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    // -------------------------------------------------------------------------

    private function validateCoupon(Request $request, bool $partial = false, ?string $excludeId = null): array
    {
        $sometimes = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'code' => [$sometimes, 'string', 'max:50',
                Rule::unique('coupons', 'code')->when($excludeId, fn ($r) => $r->ignore($excludeId))],
            'type' => [$sometimes, Rule::in(['percent', 'fixed'])],
            'value' => [$sometimes, 'integer', 'min:1'],
            'min_order_paise' => ['nullable', 'integer', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
