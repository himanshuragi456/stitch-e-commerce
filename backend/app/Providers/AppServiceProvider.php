<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
    }

    private function configureRateLimiters(): void
    {
        // Public storefront reads.
        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));

        // Authenticated API (customer/staff).
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by(
            $request->user()?->getAuthIdentifier() ?: $request->ip()
        ));

        // Sensitive auth endpoints (login/register/reset).
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(6)->by($request->ip()));
    }
}
