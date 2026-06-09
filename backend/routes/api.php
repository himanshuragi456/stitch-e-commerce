<?php

use App\Http\Controllers\Api\Storefront\CategoryController;
use App\Http\Controllers\Api\Storefront\ProductController;
use App\Http\Controllers\Api\Storefront\SettingController;
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

    Route::get('/settings/public', [SettingController::class, 'public']);
});
