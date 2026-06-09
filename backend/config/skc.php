<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Shree Krishna Collection — application configuration
    |--------------------------------------------------------------------------
    */

    // Currency. All money is stored as integer paise; this is for display/gateway.
    'currency' => 'INR',

    /*
    | Storefront rebuild trigger. When the catalog changes, the backend fires a
    | GitHub `repository_dispatch` to rebuild+redeploy the static storefront.
    | See docs/60-DEPLOYMENT.md §6.
    */
    'rebuild' => [
        'enabled' => env('STOREFRONT_REBUILD_ENABLED', false),
        'github_repo' => env('GITHUB_REPO'),
        'github_token' => env('GITHUB_DISPATCH_TOKEN'),
        'event_type' => 'rebuild-storefront',
        'debounce_seconds' => (int) env('STOREFRONT_REBUILD_DEBOUNCE_SECONDS', 90),
    ],

    // Stock threshold (in metres) below which a product is flagged "low stock".
    'low_stock_metres' => (float) env('LOW_STOCK_METRES', 5.0),

];
