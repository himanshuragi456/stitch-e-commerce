<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('gateway')->default('razorpay');
            $table->string('gateway_order_id')->nullable();
            $table->string('gateway_payment_id')->nullable();
            $table->string('gateway_signature')->nullable();
            $table->unsignedBigInteger('amount_paise');
            $table->string('status')->default('created'); // created|authorized|captured|failed|refunded
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('gateway_payment_id');
            $table->index('gateway_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
