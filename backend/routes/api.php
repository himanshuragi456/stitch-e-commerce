<?php

use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\AdminCouponController;
use App\Http\Controllers\Api\Admin\AdminCustomerController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminSettingController;
use App\Http\Controllers\Api\Admin\AdminStaffController;
use App\Http\Controllers\Api\Storefront\AccountController;
use App\Http\Controllers\Api\Storefront\AuthController;
use App\Http\Controllers\Api\Storefront\CartController;
use App\Http\Controllers\Api\Storefront\CategoryController;
use App\Http\Controllers\Api\Storefront\CheckoutController;
use App\Http\Controllers\Api\Storefront\ProductController;
use App\Http\Controllers\Api\Storefront\SettingController;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Storefront — public (no auth)
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:public')->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category:slug}', [CategoryController::class, 'show']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product:slug}', [ProductController::class, 'show']);
    Route::get('/products/{product:id}/suggestions', [ProductController::class, 'suggestions']);
    Route::get('/search', [ProductController::class, 'index']);

    // Public store config (header/footer chrome, shipping, social, style video).
    // NOTE: path is intentionally NOT "/settings/public" — the host WAF blocks that
    // path (returns 444). Keep this WAF-safe name. See docs/60-DEPLOYMENT.md.
    Route::get('/site-config', [SettingController::class, 'public']);
});

/*
|--------------------------------------------------------------------------
| Storefront — cart (guest via X-Cart-Token header, or customer auth)
|--------------------------------------------------------------------------
*/
Route::middleware(['throttle:api', 'auth:customer'])->group(function () {
    // merge requires a logged-in customer
    Route::post('/cart/merge', [CartController::class, 'merge']);
});

Route::middleware('throttle:api')->group(function () {
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'addItem']);
    Route::patch('/cart/items/{id}', [CartController::class, 'updateItem']);
    Route::delete('/cart/items/{id}', [CartController::class, 'removeItem']);
});

/*
|--------------------------------------------------------------------------
| Storefront — checkout, payments, coupons (guest or customer)
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:api')->group(function () {
    Route::post('/checkout', [CheckoutController::class, 'checkout']);
    Route::post('/checkout/verify', [CheckoutController::class, 'verify']);
    Route::post('/coupons/validate', [CheckoutController::class, 'validateCoupon']);
    Route::get('/orders/{number}/public', [CheckoutController::class, 'publicShow'])
        ->middleware('throttle:public');
});

// Webhook — no CSRF, no auth, rate-limited by IP.
Route::post('/webhooks/razorpay', [CheckoutController::class, 'webhook'])
    ->middleware('throttle:public')
    ->withoutMiddleware([VerifyCsrfToken::class]);

/*
|--------------------------------------------------------------------------
| Storefront — customer auth (rate-limited)
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

Route::post('/auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:auth'])
    ->name('verification.verify');

Route::middleware(['auth:customer', 'throttle:api'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

/*
|--------------------------------------------------------------------------
| Storefront — customer account (auth required)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:customer', 'throttle:api'])->prefix('account')->group(function () {
    Route::patch('/profile', [AccountController::class, 'updateProfile']);
    Route::patch('/password', [AccountController::class, 'updatePassword']);

    Route::get('/addresses', [AccountController::class, 'addresses']);
    Route::post('/addresses', [AccountController::class, 'storeAddress']);
    Route::patch('/addresses/{id}', [AccountController::class, 'updateAddress']);
    Route::delete('/addresses/{id}', [AccountController::class, 'deleteAddress']);

    Route::get('/orders', [AccountController::class, 'orders']);
    Route::get('/orders/{id}', [AccountController::class, 'showOrder']);
});

/*
|--------------------------------------------------------------------------
| Admin — staff auth
|--------------------------------------------------------------------------
*/
Route::middleware('throttle:auth')->prefix('admin/auth')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login']);
});

Route::middleware(['auth:staff', 'throttle:api'])->prefix('admin/auth')->group(function () {
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);
});

/*
|--------------------------------------------------------------------------
| Admin — catalog (manage-products permission)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:staff', 'throttle:api'])->prefix('admin')->group(function () {
    // Categories
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::patch('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

    // Products
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::get('/products/{id}', [AdminProductController::class, 'show']);
    Route::patch('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    // Product sub-resources
    Route::put('/products/{id}/lengths', [AdminProductController::class, 'replaceLengths']);
    Route::post('/products/{id}/images', [AdminProductController::class, 'uploadImages']);
    Route::patch('/products/{pid}/images/{iid}', [AdminProductController::class, 'updateImage']);
    Route::delete('/products/{pid}/images/{iid}', [AdminProductController::class, 'deleteImage']);
    Route::put('/products/{id}/suggestions', [AdminProductController::class, 'replaceSuggestions']);
    Route::get('/products/{id}/suggestion-candidates', [AdminProductController::class, 'suggestionCandidates']);

    // Orders
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::patch('/orders/{id}/notes', [AdminOrderController::class, 'updateNotes']);
    Route::post('/orders/{id}/refund', [AdminOrderController::class, 'refund']);
    Route::get('/orders/{id}/label', [AdminOrderController::class, 'label']);
    Route::post('/orders/labels/batch', [AdminOrderController::class, 'labelBatch']);

    // People
    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/customers/{id}', [AdminCustomerController::class, 'show']);
    Route::get('/staff', [AdminStaffController::class, 'index']);
    Route::post('/staff', [AdminStaffController::class, 'store']);
    Route::patch('/staff/{id}', [AdminStaffController::class, 'update']);
    Route::delete('/staff/{id}', [AdminStaffController::class, 'destroy']);
    Route::patch('/staff/{id}/password', [AdminStaffController::class, 'resetPassword']);

    // Coupons
    Route::get('/coupons', [AdminCouponController::class, 'index']);
    Route::get('/coupons/{id}', [AdminCouponController::class, 'show']);
    Route::post('/coupons', [AdminCouponController::class, 'store']);
    Route::patch('/coupons/{id}', [AdminCouponController::class, 'update']);
    Route::delete('/coupons/{id}', [AdminCouponController::class, 'destroy']);

    // Settings + rebuild
    Route::get('/settings', [AdminSettingController::class, 'index']);
    Route::patch('/settings', [AdminSettingController::class, 'update']);
    Route::post('/rebuild-storefront', [AdminSettingController::class, 'rebuildStorefront']);

    // Dashboard
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);
});
