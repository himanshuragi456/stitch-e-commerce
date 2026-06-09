<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_number')->unique();
            $table->uuid('customer_id')->nullable(); // null for guest checkout
            $table->string('status')->default('pending'); // OrderStatus
            $table->unsignedBigInteger('subtotal_paise');
            $table->unsignedBigInteger('shipping_paise')->default(0);
            $table->unsignedBigInteger('discount_paise')->default(0);
            $table->unsignedBigInteger('total_paise');
            $table->uuid('coupon_id')->nullable();
            $table->string('customer_email');
            $table->string('customer_phone')->nullable();
            $table->json('shipping_address');
            $table->json('billing_address')->nullable();
            $table->string('payment_status')->default('unpaid'); // PaymentStatus
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
            $table->foreign('coupon_id')->references('id')->on('coupons')->nullOnDelete();
            $table->index('status');
            $table->index('payment_status');
            $table->index('placed_at');
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->uuid('product_id')->nullable(); // nullable: product may be deleted later
            // Snapshots — never join to live product for historical orders.
            $table->string('product_name');
            $table->decimal('length_metres', 4, 2);
            $table->unsignedBigInteger('price_per_metre_paise');
            $table->string('sku')->nullable();
            $table->unsignedBigInteger('unit_price_paise'); // = price_per_metre × length (one piece)
            $table->integer('quantity');
            $table->unsignedBigInteger('line_total_paise');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
