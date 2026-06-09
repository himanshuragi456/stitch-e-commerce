<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 | Curated pairing suggestions. Admin picks which products to recommend alongside
 | a product (e.g. shirt cloth → pant cloth). The storefront renders these as
 | "Pairs well with".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_suggestions', function (Blueprint $table) {
            $table->id();
            $table->uuid('product_id');
            $table->uuid('suggested_product_id');
            $table->integer('position')->default(0);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('suggested_product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->unique(['product_id', 'suggested_product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_suggestions');
    }
};
