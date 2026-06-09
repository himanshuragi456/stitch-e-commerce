<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->longText('description')->nullable();
            $table->uuid('category_id');
            $table->string('intended_use'); // IntendedUse enum
            $table->string('material')->nullable();
            $table->string('color')->nullable();
            $table->string('color_hex', 9)->nullable();
            $table->string('pattern')->nullable();

            // Per-metre pricing model: ONE price/metre, ONE stock pool in metres.
            // Line price = price_per_metre_paise × length_metres (strictly linear).
            $table->unsignedBigInteger('price_per_metre_paise');
            $table->unsignedBigInteger('compare_at_per_metre_paise')->nullable();
            $table->decimal('stock_metres', 8, 2)->default(0);

            $table->string('sku')->nullable()->unique();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->integer('position')->default(0);
            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
            $table->index(['is_active', 'is_featured']);
            $table->index('intended_use');
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
