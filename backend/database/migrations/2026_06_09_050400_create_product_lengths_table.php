<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 | The fixed list of selectable lengths a product offers (e.g. 1.25 / 1.30 / 1.50).
 | Stores ONLY which lengths are offered — price and stock live on the product.
 | A length is purchasable iff product.stock_metres >= length_metres.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_lengths', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->decimal('length_metres', 4, 2);
            $table->integer('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->unique(['product_id', 'length_metres']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_lengths');
    }
};
