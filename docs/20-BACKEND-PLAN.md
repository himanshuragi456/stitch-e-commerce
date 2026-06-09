# Backend Plan — Laravel 11 + MySQL

> The backend is the **source of truth**. Build this first. Storefront and admin both
> consume its API (see `50-API-CONTRACT.md`). Read `00-OVERVIEW.md` §6 conventions first.

---

## 1. Stack & tooling

- **PHP 8.3**, **Laravel 11**, **MySQL 8** (MariaDB 10.6+ also fine on cPanel).
- **Auth:** Laravel Sanctum (token-based, SPA + mobile-friendly).
- **Roles/permissions:** `spatie/laravel-permission`.
- **Image handling:** `intervention/image` (resize/convert to WebP).
- **Payments:** Razorpay PHP SDK (`razorpay/razorpay`). (India-appropriate, supports UPI,
  cards, netbanking, wallets.) Keep a `PaymentGateway` interface so it can be swapped.
- **PDF (shipping stickers):** `barryvdh/laravel-dompdf`.
- **Code style:** Laravel Pint (PSR-12). Static analysis: Larastan (PHPStan level 6).
- **Testing:** PHPUnit/Pest feature tests for auth, cart, checkout, orders, payments.
- **API docs (optional but encouraged):** Scribe (`knuckleswtf/scribe`) to auto-generate
  from annotations — keeps `50-API-CONTRACT.md` honest.

### Install commands (for the implementer)
```bash
composer create-project laravel/laravel backend
cd backend
composer require laravel/sanctum spatie/laravel-permission intervention/image \
  razorpay/razorpay barryvdh/laravel-dompdf
composer require --dev laravel/pint nunomaduro/larastan pestphp/pest
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
```

---

## 2. Project structure (Laravel conventions + light DDD)

Keep controllers thin. Business logic in **Service** classes. Validation in **Form
Request** classes. Output shaping in **API Resource** classes. Authorization in
**Policies**. Do not put logic in models beyond relationships/scopes/casts.

```
backend/app/
├── Http/
│   ├── Controllers/Api/
│   │   ├── Storefront/        # public + customer endpoints
│   │   │   ├── ProductController.php
│   │   │   ├── CategoryController.php
│   │   │   ├── CartController.php
│   │   │   ├── CheckoutController.php
│   │   │   ├── OrderController.php
│   │   │   ├── AuthController.php          # customer register/login
│   │   │   └── AddressController.php
│   │   ├── Admin/             # staff endpoints (admin + employee)
│   │   │   ├── DashboardController.php
│   │   │   ├── ProductController.php
│   │   │   ├── CategoryController.php
│   │   │   ├── OrderController.php
│   │   │   ├── ShippingLabelController.php # sticker PDF
│   │   │   ├── CustomerController.php
│   │   │   ├── StaffController.php          # admin-only
│   │   │   ├── CouponController.php
│   │   │   ├── ProductSuggestionController.php
│   │   │   ├── ProductImageController.php
│   │   │   └── SettingController.php
│   │   └── Webhooks/
│   │       └── RazorpayWebhookController.php
│   ├── Requests/             # FormRequest validation (one per action)
│   ├── Resources/            # API Resources (ProductResource, OrderResource, ...)
│   └── Middleware/
├── Models/
├── Services/
│   ├── CartService.php
│   ├── CheckoutService.php
│   ├── OrderService.php
│   ├── ImageService.php
│   ├── ShippingLabelService.php
│   ├── SuggestionService.php
│   ├── Payment/PaymentGateway.php          # interface
│   ├── Payment/RazorpayGateway.php
│   └── StorefrontRebuildService.php        # fires GitHub repository_dispatch
├── Policies/
└── Enums/
    ├── OrderStatus.php
    ├── IntendedUse.php
    └── StaffRole.php
```

---

## 3. Database schema

> All money is integer **paise**. Public resources use **UUID** PKs. Soft-deletes on
> products, categories, customers. Timestamps everywhere.

### 3.1 Users / staff / customers

We separate **staff** (admin/employee — use the admin panel) from **customers** (shop on
storefront). Two tables keeps concerns clean and avoids role confusion.

**`staff`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | string | |
| email | string unique | |
| password | string | hashed |
| role | enum(`admin`,`employee`) | via spatie too; column is convenience |
| is_active | boolean default true | |
| last_login_at | timestamp null | |
| timestamps, soft deletes | | |

**`customers`**
| id | uuid PK |
| name | string |
| email | string unique |
| password | string null | null if social/guest-upgraded |
| phone | string null |
| email_verified_at | timestamp null |
| timestamps, soft deletes |

> Use `spatie/laravel-permission` with a guard for staff. Roles: `admin`, `employee`.
> Permissions (examples): `manage-products`, `manage-orders`, `view-orders`,
> `print-labels`, `manage-staff`, `manage-settings`, `manage-customers`.
> **Employee** role gets `view-orders` + `print-labels` only. **Admin** gets all.

### 3.2 Catalog

**`categories`**
| id | uuid PK |
| name | string |
| slug | string unique |
| description | text null |
| parent_id | uuid null (self FK) | supports sub-categories |
| image_path | string null |
| position | int default 0 | manual sort |
| is_active | boolean default true |
| meta_title | string null | SEO override |
| meta_description | string null | SEO override |
| timestamps, soft deletes |

**`products`**
| id | uuid PK |
| name | string |
| slug | string unique |
| description | longtext null | rich text/markdown |
| category_id | uuid FK |
| intended_use | enum(`shirt`,`pant`,`suit`,`kurta`,`saree`,`dupatta`,`other`) | the garment the cloth is for |
| material | string null | e.g. cotton, linen, silk blend |
| color | string null | display name |
| color_hex | string null | swatch |
| pattern | string null | e.g. solid, checked, printed |
| price_per_metre_paise | unsignedBigInt | the ONE price per metre for this cloth |
| compare_at_per_metre_paise | unsignedBigInt null | optional "was" price/metre for showing a discount |
| stock_metres | decimal(8,2) default 0 | **total metres in stock** (the metre pool) |
| sku | string unique null | base SKU for the cloth |
| is_active | boolean default true |
| is_featured | boolean default false |
| position | int default 0 |
| meta_title | string null |
| meta_description | string null |
| timestamps, soft deletes |

> **Pricing model (IMPORTANT — read carefully):** Each cloth has **one** `price_per_metre`
> and **one** stock pool measured in **metres**. The customer picks a length from a fixed
> list (below); the line price is computed **strictly linearly**:
> `line_price_paise = price_per_metre_paise × length_metres` (rounded to the nearest paise).
> There is **no per-length price** and **no per-length override** — price is always
> per_metre × length. Buying 1.50 m deducts 1.50 from `stock_metres`.

**`product_lengths`** (the fixed list of selectable lengths offered for a product)
| id | uuid PK |
| product_id | uuid FK |
| length_metres | decimal(4,2) | e.g. 1.25, 1.30, 1.50 |
| position | int default 0 | display order of the chips |
| is_active | boolean default true |
| timestamps |
| unique(product_id, length_metres) |

> This table only stores **which lengths are offered**, not prices or stock — those live on
> the product (`price_per_metre_paise`, `stock_metres`). A length option is purchasable iff
> `stock_metres >= length_metres`. The price shown on each chip is computed, not stored.
> The product can offer different lengths than other products (per-product custom list).

**`product_images`**
| id | uuid PK |
| product_id | uuid FK |
| path | string | stored WebP path |
| alt | string null |
| is_primary | boolean default false | the swatch shown on cards |
| position | int default 0 | gallery order |
| timestamps |

> Product page shows a slider when `product_images` count > 1; primary image first.

**`product_suggestions`** (curated pairing — the key feature)
| id | bigint PK |
| product_id | uuid FK | the product being viewed |
| suggested_product_id | uuid FK | the recommended pairing |
| position | int default 0 | order shown |
| timestamps |
| unique(product_id, suggested_product_id) |

> Admin curates these. Logic note for UI: when configuring suggestions for a *shirt*
> product, the admin will naturally pick *pant* products, etc. We don't enforce it in DB,
> but the admin UI should **default the suggestion picker's filter to complementary
> intended_use** (see `SuggestionService::complementaryUses()` below) to make curation
> fast and correct. The storefront simply renders whatever the admin saved.

### 3.3 Cart

Carts persist for guests (by token) and customers (by customer_id). Merge guest cart into
customer cart on login.

**`carts`**
| id | uuid PK |
| customer_id | uuid null FK |
| token | string unique null | guest cart identifier (cookie/localStorage) |
| timestamps |

**`cart_items`**
| id | uuid PK |
| cart_id | uuid FK |
| product_id | uuid FK | the cloth |
| length_metres | decimal(4,2) | the chosen length (must exist in `product_lengths`, active) |
| quantity | int | number of pieces of THIS length (e.g. 2 × 1.50 m) |
| timestamps |
| unique(cart_id, product_id, length_metres) |

> A cart line is "this cloth, this length, this quantity." Unit price is computed
> (`price_per_metre × length`); line total = unit × quantity. **Metres consumed by a line =
> `length_metres × quantity`** — used for stock checks against `stock_metres`.

### 3.4 Orders

**`orders`**
| id | uuid PK |
| order_number | string unique | human-friendly e.g. SKC-2026-00042 |
| customer_id | uuid null FK | null for guest checkout |
| status | enum OrderStatus | pending, paid, processing, shipped, delivered, cancelled, refunded |
| subtotal_paise | unsignedBigInt |
| shipping_paise | unsignedBigInt |
| discount_paise | unsignedBigInt default 0 |
| total_paise | unsignedBigInt |
| coupon_id | uuid null FK |
| customer_email | string | snapshot |
| customer_phone | string null | snapshot |
| shipping_address | json | full snapshot (name, line1, line2, city, state, pincode, country, phone) |
| billing_address | json null |
| payment_status | enum(`unpaid`,`paid`,`failed`,`refunded`) |
| payment_method | string null | razorpay |
| notes | text null | internal staff notes |
| placed_at | timestamp null |
| timestamps |

**`order_items`** (snapshot — never join to live product for historical orders)
| id | uuid PK |
| order_id | uuid FK |
| product_id | uuid null FK | nullable (product may be deleted later) |
| product_name | string | snapshot |
| length_metres | decimal(4,2) | chosen length, snapshot |
| price_per_metre_paise | unsignedBigInt | snapshot of the rate at purchase time |
| sku | string null | snapshot |
| unit_price_paise | unsignedBigInt | snapshot = price_per_metre × length (one piece) |
| quantity | int |
| line_total_paise | unsignedBigInt | unit_price × quantity |
| timestamps |

**`payments`**
| id | uuid PK |
| order_id | uuid FK |
| gateway | string | razorpay |
| gateway_order_id | string null | razorpay order id |
| gateway_payment_id | string null |
| gateway_signature | string null |
| amount_paise | unsignedBigInt |
| status | enum(`created`,`authorized`,`captured`,`failed`,`refunded`) |
| raw_payload | json null | gateway response for audit |
| timestamps |

### 3.5 Supporting

**`addresses`** (saved customer addresses)
| id, customer_id FK, label, name, phone, line1, line2 null, city, state, pincode, country default 'IN', is_default bool, timestamps |

**`coupons`**
| id, code unique, type enum(`percent`,`fixed`), value int (percent or paise), min_order_paise null, usage_limit null, used_count default 0, starts_at null, expires_at null, is_active bool, timestamps |

**`settings`** (key-value store for store config)
| id, key unique, value json, timestamps |
> Holds: store name, contact, address, shipping flat rate / free-shipping threshold,
> currency, social links, etc. Wrap in a `SettingService` with typed getters.

---

## 4. Enums

```php
// OrderStatus.php
enum OrderStatus: string {
  case Pending = 'pending';
  case Paid = 'paid';
  case Processing = 'processing';
  case Shipped = 'shipped';
  case Delivered = 'delivered';
  case Cancelled = 'cancelled';
  case Refunded = 'refunded';
}

// IntendedUse.php
enum IntendedUse: string {
  case Shirt = 'shirt'; case Pant = 'pant'; case Suit = 'suit';
  case Kurta = 'kurta'; case Saree = 'saree'; case Dupatta = 'dupatta';
  case Other = 'other';
}

// StaffRole.php
enum StaffRole: string { case Admin = 'admin'; case Employee = 'employee'; }
```

---

## 5. Key services (logic lives here)

### CartService
- `getOrCreate(token|customer)`, `addItem(productId, lengthMetres, qty)`, `updateItem`,
  `removeItem`, `merge(guestCart, customerCart)`, `totals()`
  (subtotal/shipping/discount/total).
- Validates: the chosen length exists in `product_lengths` (active); and
  **`sum(length_metres × quantity)` for that product across the cart ≤ `stock_metres`** at
  add-time AND re-checked at checkout (stock may change between).
- Unit price is **computed**: `round(price_per_metre_paise × length_metres)`. Never trust a
  client-supplied price.

### CheckoutService
- `createOrderFromCart(cart, addressData, couponCode?)`:
  validate lengths + metre stock → compute totals (line = unit × qty) → create `order` +
  `order_items` (snapshots incl. `length_metres`, `price_per_metre_paise`) → create
  Razorpay order via gateway → return payment params.
- On payment success (via webhook OR client confirm + server verify): mark order `paid`,
  **decrement `stock_metres` by `length_metres × quantity` for each line**, clear cart,
  send confirmation email.
- **Use DB transactions** around order creation + stock decrement. Lock product rows
  (`SELECT ... FOR UPDATE`) when decrementing `stock_metres` to avoid overselling.

### OrderService
- Status transitions with guards (can't ship an unpaid order, etc.), generate
  `order_number`, list/filter for admin, customer order history.

### ImageService
- On upload: validate, resize to a max (e.g. 1600px), convert to **WebP**, generate a
  thumbnail (e.g. 400px), store under `storage/app/public/products/{uuid}/`. Return paths.
- Return public URLs via `Storage::url()`. Ensure `php artisan storage:link`.

### SuggestionService
- `complementaryUses(IntendedUse): array` — maps an intended use to what pairs with it,
  used to pre-filter the admin suggestion picker:
  ```
  shirt   -> [pant, suit]
  pant    -> [shirt, suit]
  suit    -> [shirt]            (matching shirt cloth)
  kurta   -> [dupatta, pant]
  saree   -> [dupatta]
  dupatta -> [kurta, saree]
  other   -> [all]
  ```
- `forProduct(productId): Collection` — returns curated `product_suggestions` (active
  products only), ordered by position, for the storefront.

### ShippingLabelService
- `generate(order|orders): PDF` — renders a sticker template (see §7) to PDF via dompdf.
  Supports single and **batch** (multiple stickers, one per page) for employees.

### StorefrontRebuildService
- `trigger(reason)`: POST to GitHub `repository_dispatch` with the configured repo + PAT
  (from env). **Debounced**: don't fire more than once per N seconds — implement via a
  cache lock + queued job so 10 rapid edits cause 1 rebuild. Called from product/category
  create/update/delete and from settings changes that affect the storefront.
  Details + exact payload in `60-DEPLOYMENT.md`.

### Payment/PaymentGateway (interface)
```php
interface PaymentGateway {
  public function createOrder(int $amountPaise, string $receipt): array; // gateway order
  public function verifySignature(array $payload): bool;
  public function fetchPayment(string $paymentId): array;
  public function refund(string $paymentId, int $amountPaise): array;
}
```
`RazorpayGateway implements PaymentGateway`. Swappable later.

---

## 6. Authentication & authorization

- **Customers:** `POST /api/auth/register`, `/login` issue Sanctum tokens
  (`customer` ability). Email verification via Laravel's built-in flow. Password reset.
- **Staff:** `POST /api/admin/auth/login` issues Sanctum tokens with role abilities.
  No public staff registration — admins create staff via Staff management.
- **Guards/abilities:** tag tokens with abilities; protect admin routes with a middleware
  that checks staff guard + spatie permission. Customer routes check customer ownership
  (a customer can only see their own orders/addresses) via **Policies**.
- Rate-limit auth endpoints (`throttle:6,1`). Rate-limit the API generally
  (`throttle:60,1` for public, higher for authed).

---

## 7. Shipping sticker / label (employee feature)

A printable **4×6 inch** thermal-label-friendly layout (standard shipping label size).

Blade template `resources/views/labels/shipping.blade.php` rendered by dompdf:
```
┌────────────────────────────────────────┐
│ [SKC logo]        Shree Krishna Collection│
│ FROM: <store address from settings>      │
│------------------------------------------│
│ TO:                                      │
│   <customer name>                        │
│   <line1>, <line2>                       │
│   <city>, <state> - <pincode>            │
│   Phone: <phone>                         │
│------------------------------------------│
│ Order: SKC-2026-00042   Date: ...        │
│ Items: <count>   Weight: ___            │
│ [CODE128 barcode of order_number]        │
└────────────────────────────────────────┘
```
- Barcode: use a Code128 generator (`milon/barcode` or render via JS-free PHP barcode lib)
  encoding `order_number` for scan-at-courier.
- Endpoints:
  - `GET /api/admin/orders/{id}/label` → single label PDF (inline/download).
  - `POST /api/admin/orders/labels/batch` body `{order_ids:[...]}` → multi-page PDF.
- **Employees can access these** (permission `print-labels`). The admin UI exposes a
  "Print sticker" button on each order and a "Print selected" bulk action.

---

## 8. Payment flow (Razorpay) — exact sequence

1. Storefront checkout → `POST /api/checkout` → backend creates `order` (status `pending`,
   payment `unpaid`) + a Razorpay order; returns `{ order, razorpay: { key_id,
   razorpay_order_id, amount_paise, currency } }`.
2. Storefront opens Razorpay Checkout (client SDK) with those params.
3. On success, Razorpay returns `razorpay_payment_id`, `razorpay_order_id`,
   `razorpay_signature` to the client; storefront POSTs them to
   `POST /api/checkout/verify`.
4. Backend **verifies the signature** server-side, captures, marks order `paid`,
   decrements stock (transaction), clears cart, emails confirmation.
5. **Also** handle `POST /api/webhooks/razorpay` (signed) as the authoritative source —
   in case the client never returns. Idempotent (ignore duplicates by payment id).

> Never trust the client's "paid" claim without server-side signature verification.

---

## 9. Validation, errors, security

- One **FormRequest** per write action with explicit rules; never mass-assign unguarded.
- Use **API Resources** for all output (no raw model `->toArray()`).
- Consistent error shape (Laravel default). Validation → 422. Auth → 401. Forbidden → 403.
  Not found → 404. Server → 500 (logged, generic message in prod).
- CORS: allow storefront + admin origins only (config in `config/cors.php`, from env).
- Sanitize/escape rich text product descriptions (allowlist HTML) to prevent stored XSS.
- Hide internal IDs/fields in resources. Never expose `password`, raw payment payloads, etc.
- File uploads: validate mime + size; store outside webroot, serve via storage link.
- Use signed URLs / email verification / password reset per Laravel defaults.

---

## 10. Seeders & factories (so frontends have data immediately)

- `StaffSeeder`: 1 admin (`admin@skc.test`), 1 employee (`employee@skc.test`).
- `CategorySeeder`: Shirting, Pants/Trousers, Suiting, Kurta, Ethnic, etc.
- `ProductFactory` + `ProductSeeder`: ~40 products across categories, each with a
  `price_per_metre_paise`, a `stock_metres` pool, 2–3 offered `product_lengths`
  (e.g. 1.25/1.30/1.50), 1–4 images (use placeholder cloth images), realistic
  intended_use/material/color/pattern.
- `ProductSuggestionSeeder`: wire complementary pairings (shirt↔pant) so the storefront
  suggestion UI shows real data.
- `SettingSeeder`: store info, shipping flat rate, free-ship threshold.
- `CouponSeeder`: a couple of demo coupons.

Provide `php artisan migrate:fresh --seed` as the one-command reset.

---

## 11. Testing (minimum bar)

Pest/PHPUnit feature tests for:
- Customer register/login/verify; staff login + role gating (employee blocked from admin-
  only routes).
- Product listing/filtering/detail returns correct shape.
- Cart add/update/remove/merge + totals; **computed unit price = per_metre × length**;
  **metre-stock validation** (reject when `Σ(length × qty) > stock_metres`); reject a
  length not in the product's `product_lengths`.
- Checkout creates order + Razorpay order; verify endpoint marks paid & **decrements
  `stock_metres` by `length × qty`** (with row lock, no overselling under concurrency);
  duplicate webhook is idempotent.
- Order status transitions guarded.
- Label PDF endpoint returns PDF and respects `print-labels` permission.
- Suggestions endpoint returns curated, active-only, ordered.

Aim: green CI on every push (see `60-DEPLOYMENT.md`).

---

## 12. What an implementer should produce, in order
1. Install + configure packages, `.env.example`, Pint, Larastan, CORS, Sanctum.
2. All migrations + models (with relationships, casts, UUID trait, soft deletes) + enums.
3. Seeders/factories → `migrate:fresh --seed` works.
4. Auth (customer + staff) + roles/permissions + policies.
5. Storefront read endpoints (categories, products, product detail, suggestions, search).
6. Cart + checkout + payments + webhooks.
7. Customer account endpoints (profile, addresses, orders).
8. Admin endpoints (dashboard, product/category/length/image CRUD, suggestions config,
   orders, labels, customers, staff, coupons, settings).
9. StorefrontRebuildService + wire to catalog mutations.
10. Feature tests. Then freeze `50-API-CONTRACT.md`.

> Cross-check every endpoint against `50-API-CONTRACT.md`. If something's missing there,
> update the contract first, then implement.
