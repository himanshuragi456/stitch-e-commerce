<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StorefrontRebuildService
{
    public function trigger(string $reason = 'admin-update'): bool
    {
        if (! config('skc.rebuild.enabled')) {
            Log::info("Storefront rebuild skipped (disabled): {$reason}");

            return false;
        }

        $repo = config('skc.rebuild.github_repo');
        $token = config('skc.rebuild.github_token');
        $event = config('skc.rebuild.event_type', 'rebuild-storefront');

        if (! $repo || ! $token) {
            Log::warning('Storefront rebuild: missing GITHUB_REPO or GITHUB_TOKEN.');

            return false;
        }

        $response = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repo}/dispatches", [
                'event_type' => $event,
                'client_payload' => ['reason' => $reason],
            ]);

        if ($response->failed()) {
            Log::error("Storefront rebuild failed: {$response->status()} {$response->body()}");

            return false;
        }

        Log::info("Storefront rebuild triggered: {$reason}");

        return true;
    }
}
