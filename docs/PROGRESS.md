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
| Backend cart / checkout / payments | ⛔ Not started |
| Backend customer account + admin API | ⛔ Not started |
| Storefront setup + design system | ✅ Complete |
| Storefront home page (+ video + sections) | ✅ Complete |
| Storefront category / product / cart / checkout / account pages | ⛔ Not started |
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

---

## ⛔ Next up (recommended order)

Follows `70-BUILD-ORDER.md`. Suggested path:

1. **Storefront category page** — `category/[slug].astro` (getStaticPaths, grid, filters,
   SEO). Makes browsing work. *(Build-order 4.4)*
2. **Storefront product detail page** — the SEO centerpiece: gallery slider, length
   selector (computed per-piece price), add-to-cart, "Pairs well with", Product +
   Breadcrumb JSON-LD. *(4.5)*
3. **Backend cart + checkout + payments** *(2.2–2.3)* then **storefront cart + checkout**
   *(4.6, 4.8)*.
4. **Backend customer account** *(2.4)* + **storefront auth/account** *(4.7)*.
5. **Backend admin API** *(3.x)* then **admin panel app** (folder not yet created) *(5.x)*.
6. **Deployment / CI-CD** *(6.x)* — needs git first (see Known gaps).

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
