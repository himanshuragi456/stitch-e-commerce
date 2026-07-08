# Progress & Handoff — Shree Krishna Collection

> **Read this first when picking up the project.** It records what's built, what's next,
> and how to run things. Pairs with `70-BUILD-ORDER.md` (the full task list) and the
> per-app plans. Last updated: 2026-06-09.

---

## Status at a glance

| Area | Status |
|------|--------|
| Planning docs (`docs/00`–`70`) | ✅ Complete |
| Backend foundation (schema, models, seeders) | ✅ Complete |
| Backend storefront READ API | ✅ Complete |
| Backend cart | ✅ Complete |
| Backend checkout / payments | ✅ Complete |
| Backend customer auth + account | ✅ Complete |
| Backend staff auth (1.6) | ✅ Complete |
| Backend admin API (3.1–3.4) | ✅ Complete |
| Storefront setup + design system | ✅ Complete |
| Storefront home page (+ video + sections) | ✅ Complete |
| Storefront category page | ✅ Complete |
| Storefront product detail page | ✅ Complete |
| Storefront cart / checkout / account pages | ⛔ Not started |
| Admin panel | ⛔ Not started (folder not created) |
| Deployment / CI-CD | ⛔ Not started (no git repo yet) |

---

## ✅ Done in detail

### Backend (`backend/`) — Laravel 11 + MySQL
- Installed: Laravel 11, Sanctum, spatie/permission, intervention/image, dompdf, Razorpay SDK.
- Config: CORS locked to storefront+admin origins; `config/skc.php` (rebuild, currency,
  low-stock); rate limiters (`public`, `api`, `auth`); `.env` + `.env.example`.
- DB: 15 migrations — `staff`, `customers` (separate UUID tables; NO default `users`),
  `categories`, `products` (per-metre price + `stock_metres`), `product_lengths`,
  `product_images`, `product_suggestions`, carts/cart_items, addresses, coupons,
  orders/order_items, payments, settings.
- Enums: `OrderStatus` (guarded transitions), `IntendedUse` (complementary-pairing),
  `StaffRole`, `PaymentStatus`.
- Models: all 14, with relationships, casts, pricing helpers (`priceForLength`,
  `lengthPurchasable`).
- Auth/roles: `staff` + `customer` Sanctum guards; admin = 7 perms, employee =
  `view-orders` + `print-labels`.
- Seeders: 2 staff, 5 categories, 40 products (lengths, real Unsplash fabric images,
  curated shirt↔pant suggestions), settings (incl. `style_video`), coupons.
- API Resources: `ProductListResource`, `ProductDetailResource`, `ProductLengthResource`
  (computed `unit_price_paise`/`purchasable`), `ProductImageResource`, `CategoryResource`,
  `PaginatedCollection` (trimmed contract meta).
- **READ endpoints live & tested**: `/categories`, `/categories/{slug}`, `/products`
  (filter/sort/search/paginate), `/products/{slug}`, `/products/{id}/suggestions`,
  `/search`, `/settings/public` (incl. normalized `style_video.youtube_id`).
- `SettingService` (cached settings + YouTube URL→id extractor).

### Storefront (`storefront/`) — Astro (static) + Tailwind v4 + React islands
- Setup: Astro 6, Tailwind v4 (`@theme` tokens in `src/styles/global.css`), React +
  sitemap integrations, self-hosted Fraunces + Inter, `.env` + `.env.example`.
- `lib/`: `types.ts` (mirror of API contract), `api.ts` (typed client, build+runtime),
  `format.ts` (paise→₹, length), `images.ts` (verified Unsplash fabric pool + helpers).
- Layout/SEO: `BaseLayout`, `Header`, `Footer`, `Logo` (custom peacock-feather SVG),
  `BaseHead` (title/meta/OG/canonical/JSON-LD), `favicon.svg`.
- Components: `ProductCard`, `StyleVideo` (click-to-load YouTube facade).
- **Home page** complete: hero (blazer image) → daily style video → categories (fabric
  bg) → how-it-works → featured → brand story → new arrivals → trust band → why-shop →
  newsletter CTA. Organization JSON-LD. Responsive, `astro check` clean, builds to static.

### Storefront (`storefront/`) — Category + Story images update
- `lib/images.ts`: added `unsplashSlug()` helper (builds `unsplash.com/photos/{slug}/download` redirect URLs — verified working); added `CATEGORY_IMAGES` map (shirting, trousers-pants, suiting, kurta-fabric, ethnic-festive) with user-specified Unsplash photos; added `STORY_IMAGE` for the brand story band.
- `pages/index.astro`: categories grid now uses `CATEGORY_IMAGES[c.slug]` as fallback before generic fabric fallback; `storyImage` uses `STORY_IMAGE`.
- `pages/category/[slug].astro`: hero uses `CATEGORY_IMAGES[slug]` as fallback.
- `astro check` clean.

### Storefront (`storefront/`) — Category page
- `pages/category/[slug].astro`: `getStaticPaths` from all active categories; hero banner
  with category image (fabric fallback); BreadcrumbList JSON-LD; meta/OG from
  `meta_title`/`meta_description` with auto-fallback.
- `components/islands/FilterSort.tsx` (React, `client:load`): filter panel (material, colour,
  in-stock toggle) + sort dropdown; syncs state to URL search params; live-fetches from API
  on change; pagination with ellipsis; product grid with `ProductCardMini` (same design as
  `ProductCard`). Initial products baked at build time for SSG/SEO; island takes over for
  interaction.
- `components/layout/Breadcrumbs.astro`: reusable breadcrumb strip used by category page
  (and ready for product page).

### Backend — Staff auth + Admin API (tasks 1.6, 3.1–3.4)
- `AdminAuthController`: `POST /admin/auth/login` (checks is_active, updates last_login_at, returns token + StaffResource), `POST /admin/auth/logout`, `GET /admin/auth/me`.
- `StaffResource`: `{id, name, email, role, permissions[], is_active, last_login_at}`.
- `AdminProductController` (18 endpoints): list/create/show/update/soft-delete products; replace lengths (PUT); upload images (multipart, WebP+thumb via ImageService); update/delete images; replace suggestions; suggestion-candidates (complementary intended_use filter).
- `AdminCategoryController` (4 endpoints): list/create/update/soft-delete; image upload via ImageService.
- `AdminOrderController` (8 endpoints): list (filter by status/payment_status/date/search), detail, status update (guarded transitions), notes update, refund, single PDF label, batch PDF labels.
- `AdminCustomerController` (2 endpoints): list (search), detail (with recent 10 orders).
- `AdminStaffController` (5 endpoints): list, create (auto-assigns Spatie permissions by role), update, soft-delete (self-deletion blocked), password reset.
- `AdminCouponController` (5 endpoints): full CRUD.
- `AdminSettingController` (3 endpoints): list all settings, bulk update (clears SettingService cache), manual storefront rebuild.
- `AdminDashboardController`: KPIs (revenue 30d, orders today/total, customers, pending/processing), daily sales series (30d), low-stock products, recent 10 orders.
- `ImageService`: processes uploads to WebP (1200px) + WebP thumbnail (400px) via Intervention/Image GD driver; stores to `public` disk; deletes relative paths safely.
- `StorefrontRebuildService`: sends GitHub `repository_dispatch` event when rebuild.enabled=true; logs skip/error/success.
- `ShippingLabelService` + `labels/shipping.blade.php`: 4×6 inch PDF (dompdf); ship-to block, item table, totals, barcode stand-in; supports single and multi-page batch.
- **41 admin routes** total under `auth:staff` middleware. Pint clean.
- Smoke-tested: login/logout/me, category list, product list/create/lengths/suggestions/delete, dashboard KPIs, staff list, settings, coupons.

### Backend — Customer auth + account (task 2.4)
- `AuthController`: `POST /auth/register` (hashed password, fires `Registered` event, returns token + customer), `POST /auth/login` (Hash::check, returns token), `POST /auth/logout` (deletes current token), `GET /auth/me`, `POST /auth/forgot-password` (Password broker 'customers'), `POST /auth/reset-password`, `POST /auth/email/verify/{id}/{hash}` (signed route).
- `AccountController`: `PATCH /account/profile`, `PATCH /account/password` (current_password check), addresses CRUD (auto-default on first, promotes next on delete), `GET /account/orders` (paginated, `{data,meta}`), `GET /account/orders/{id}` (ownership enforced via `customer->orders()->findOrFail`).
- `CustomerResource` / `AddressResource` matching API contract.
- **Bug fix** — `personal_access_tokens.tokenable_id` was `bigint` (Sanctum default) but models use UUID strings. New migration changes it to `varchar(36)`.
- **Bug fix** — `Authenticate::redirectUsing()` in `AppServiceProvider` prevents the middleware from attempting to redirect to a non-existent `login` named route; API requests now correctly receive 401 JSON.
- Smoke-tested: register → me → add address (auto-default) → profile update → password change → login with new password → order list (`{data,meta}`) → logout → token invalidated (401).

### Backend — Checkout + Payments (task 2.3)
- `PaymentGateway` contract (`app/Contracts/PaymentGateway.php`): `createOrder`, `verifyPayment`, `verifyWebhookSignature`.
- `RazorpayGateway` (`app/Services/RazorpayGateway.php`): implements the contract using the Razorpay PHP SDK; all three methods. Bound to the interface in `AppServiceProvider`.
- `CheckoutService` (`app/Services/CheckoutService.php`): `validateCoupon` (strtoupper, `isValidNow`, min-order check); `createOrder` — DB transaction: row-locks every product, verifies active + length offered + stock_metres ≥ metres_needed, decrements stock, snapshots order_items, computes shipping (free threshold), applies coupon (increments `used_count`), creates `Order` + `OrderItem` rows, calls gateway `createOrder`, persists `Payment` row with `gateway_order_id`, clears cart; `verifyPayment` — idempotent, row-locks payment + order, calls gateway `verifyPayment`, marks paid, sends confirmation email; `handleWebhookEvent` — handles `payment.captured` (idempotent) and `payment.failed`.
- `OrderItemResource` / `OrderResource`: exact API contract shapes.
- `CheckoutController`: `POST /checkout`, `POST /checkout/verify`, `POST /webhooks/razorpay` (CSRF-exempt, signature verified when key set), `GET /orders/{number}/public` (email required), `POST /coupons/validate`.
- Smoke-tested: empty cart → 422; bad coupon → 422; valid coupon with sufficient subtotal → 200 with correct discount math (10% of ₹3,038 = ₹304). Razorpay call itself requires live keys (empty locally, expected).

### Backend — Cart (task 2.2)
- `CartService`: `resolveCart` (customer cart or guest X-Cart-Token cart, lazy-created);
  `addItem` (row-locked product, validates length in `product_lengths`, metre-stock check
  Σ(length×qty) ≤ stock_metres, upserts existing line); `updateItem` (qty=0 removes, re-checks
  stock excluding own line); `removeItem`; `mergeGuestCart` (moves guest lines into customer
  cart, clamps to stock, deletes guest cart); `loadCart` (eager-loads items→product→images).
- `CartItemResource` / `CartResource`: match `50-API-CONTRACT.md` §1 shapes exactly
  (computed `unit_price_paise`, `line_total_paise`, `available`, embedded `product` with
  `primary_image`).
- `CartController`: 5 endpoints (`GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`,
  `DELETE /cart/items/{id}`, `POST /cart/merge`). Merge requires `auth:customer`; all others
  accept guest token or customer.
- `bootstrap/app.php`: added `shouldRenderJsonWhen` so all `/api/*` errors return JSON
  (fixes `abort()` returning HTML in dev).
- Smoke-tested all endpoints: empty cart, add item (price correct), update qty, over-stock
  rejection (422 JSON), delete item.

### Storefront (`storefront/`) — Product detail page
- `pages/product/[slug].astro`: `getStaticPaths` paginates through all products; two-column
  layout (gallery sticky left, info right on desktop); breadcrumbs with category link;
  intended-use + out-of-stock badges; description as sanitized HTML.
- `components/islands/ProductGallery.tsx` (React, `client:load`): single image → plain
  `<img>`; multiple → slider with prev/next arrows, dot indicator, thumbnail strip, swipe
  support (touch), and keyboard arrow keys.
- `components/islands/LengthSelector.tsx` (React, `client:load`): length chips with
  computed per-piece price; unavailable lengths struck-through and disabled; quantity
  stepper (capped by stock_metres); per-metre price header with discount badge; running
  total summary; Add-to-cart and Buy-now buttons (calls `POST /cart/items` with cart token,
  stubbed until task 2.2); unstitched cloth helper note.
- `components/seo/ProductJsonLd.astro`: schema.org `Product` JSON-LD (`AggregateOffer`
  with low/high price across purchasable lengths, `InStock`/`OutOfStock`) + `BreadcrumbList`
  JSON-LD in `slot="head"`.
- `"Pairs well with"` section: renders up to 4 suggestions (embedded or fetched fallback);
  hidden if empty.

---

## ⛔ Next up (recommended order)

Follows `70-BUILD-ORDER.md`. Suggested path:

1. **Admin panel React + Vite SPA** *(5.x)* — `admin/` folder not yet created; auth/guards,
   app shell, products/categories/orders/people/settings screens.
2. **Storefront cart + checkout + account pages** *(4.6–4.8)*.
3. **Deployment / CI-CD** *(6.x)* — needs git first (see Known gaps).

---

## How to run locally

```bash
# Backend (terminal 1) — needs MySQL running, DB `skc_ecommerce`
cd backend
php artisan migrate:fresh --seed   # reset + seed demo data
php artisan serve --port=8000      # API at http://localhost:8000/api

# Storefront (terminal 2)
cd storefront
npm install
npm run dev                        # http://localhost:4321  (build-time fetch needs API up)
npm run build && npm run preview   # production build / preview
```

- Seeded logins: `admin@skc.test` / `employee@skc.test`, password `password`.
- Local PHP is 8.2 (plans say 8.3; Laravel 11 runs on 8.2 fine). MySQL: user `root`, no
  password, DB `skc_ecommerce`.
- Quality gates: backend `vendor/bin/pint`; storefront `npx astro check`.

---

## Known gaps / decisions to flag

- **No git repo yet.** Files are saved on disk but not version-controlled. CI/CD
  (`60-DEPLOYMENT.md`) needs git + a GitHub remote. Initialise before deploy work.
- **Logo raster assets not generated** — only `favicon.svg` exists. Still need
  apple-touch-icon (180), PWA icons (192/512/maskable), OG image (1200×630), `.ico`,
  and a `site.webmanifest` wired into `BaseHead`.
- **Images are hotlinked Unsplash URLs** (fine for dev/prod; for best Core Web Vitals
  later, self-host via `astro:assets`).
- **`admin/` folder doesn't exist yet** — create when starting Phase 5.
- Payment gateway = Razorpay (keys empty in `.env`); rebuild trigger disabled
  (`STOREFRONT_REBUILD_ENABLED=false`) until GitHub repo exists.

---

## Source-of-truth map
- Shared contract & conventions → `00-OVERVIEW.md`
- API endpoints/shapes → `50-API-CONTRACT.md` (wins any disagreement)
- Pricing model → `00-OVERVIEW.md` §2 + memory `skc-pricing-model`
- Full task list → `70-BUILD-ORDER.md`
- This progress snapshot → here
