<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StorefrontRebuildService
{
    /**
     * Fire a storefront rebuild.
     *
     * @param  bool  $manual  true when a human clicked "Publish changes"; such
     *                        requests bypass the `auto` gate. Automatic
     *                        (catalog-edit) triggers only fire when auto is on.
     */
    public function trigger(string $reason = 'admin-update', bool $manual = false): bool
    {
        if (! config('skc.rebuild.enabled')) {
            Log::info("Storefront rebuild skipped (disabled): {$reason}");

            return false;
        }

        if (! $manual && ! config('skc.rebuild.auto')) {
            Log::info("Storefront rebuild skipped (auto off, use Publish button): {$reason}");

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
