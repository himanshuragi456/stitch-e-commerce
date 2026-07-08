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
        // Give a precise reason when it can't run, instead of a vague failure.
        if (! config('skc.rebuild.enabled')) {
            return response()->json([
                'triggered' => false,
                'message' => 'Auto-rebuild is disabled. Set STOREFRONT_REBUILD_ENABLED=true in the server .env.',
            ], 422);
        }
        if (! config('skc.rebuild.github_repo') || ! config('skc.rebuild.github_token')) {
            return response()->json([
                'triggered' => false,
                'message' => 'Rebuild not configured: GITHUB_REPO and GITHUB_DISPATCH_TOKEN must be set in the server .env.',
            ], 422);
        }

        $triggered = $this->rebuild->trigger('manual');

        return response()->json([
            'triggered' => $triggered,
            'message' => $triggered
                ? 'Storefront rebuild dispatched — the live site updates in ~1–2 minutes.'
                : 'Rebuild dispatch failed. Check the GitHub token permissions (Actions: read/write) and server logs.',
        ], $triggered ? 200 : 502);
    }
}
