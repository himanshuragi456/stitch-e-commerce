<?php

namespace App\Http\Controllers\Api\Storefront;

use App\Http\Controllers\Controller;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    public function __construct(private readonly SettingService $settings) {}

    /**
     * GET /api/settings/public
     */
    public function public(): JsonResponse
    {
        return response()->json(['data' => $this->settings->publicSettings()]);
    }
}
