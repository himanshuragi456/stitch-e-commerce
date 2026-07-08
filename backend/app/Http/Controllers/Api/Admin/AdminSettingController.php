<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\SettingService;
use App\Services\StorefrontRebuildService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingController extends Controller
{
    public function __construct(
        private readonly SettingService $settings,
        private readonly StorefrontRebuildService $rebuild,
    ) {}

    /**
     * GET /api/admin/settings
     */
    public function index(): JsonResponse
    {
        $settings = Setting::orderBy('key')->pluck('value', 'key');

        return response()->json(['data' => $settings]);
    }

    /**
     * PATCH /api/admin/settings
     * Body: { key: value, ... }
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        // Clear cached settings so next request gets fresh values.
        $this->settings->flush();

        return response()->json(['message' => 'Settings updated.']);
    }

    /**
     * POST /api/admin/rebuild-storefront
     */
    public function rebuildStorefront(): JsonResponse
    {
        $triggered = $this->rebuild->trigger('manual');

        return response()->json([
            'triggered' => $triggered,
            'message' => $triggered
                ? 'Storefront rebuild dispatched.'
                : 'Rebuild skipped (disabled or missing config).',
        ]);
    }
}
