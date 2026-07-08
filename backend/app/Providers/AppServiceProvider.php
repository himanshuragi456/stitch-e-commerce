<?php

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Services\RazorpayGateway;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PaymentGateway::class, RazorpayGateway::class);
    }

    public function boot(): void
    {
        // API routes never redirect to login — always return 401 JSON.
        Authenticate::redirectUsing(function (Request $request) {
            if ($request->is('api/*')) {
                return null;
            }
        });

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
