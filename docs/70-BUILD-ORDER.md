# Build Order — Step-by-Step Task Breakdown

> Execution plan for implementers (incl. smaller models like Sonnet). Each task is small,
> ordered, and has a clear "done" check. **Before any task:** read `00-OVERVIEW.md`, the
> relevant app plan, and `50-API-CONTRACT.md`. **Never invent endpoints/fields** — if
> missing, update the contract first.

> ### ✅ Progress (see `PROGRESS.md` for the full snapshot)
> - **Done:** Phase 1 (1.1–1.5 ✅; 1.6 auth ⛔ not yet), Phase 2.1 (catalog read API ✅),
>   Phase 4.1–4.3 (storefront setup, layout, home page ✅, plus daily-video section +
>   extra home sections).
> - **Not started:** 1.6 auth, 2.2–2.4 (cart/checkout/account), Phase 3 (admin API),
>   4.4–4.9 (category/product/cart/checkout/account pages), Phase 5 (admin app — folder
>   not created), Phase 6 (deploy — no git repo yet).
> - **Recommended next:** 4.4 category page → 4.5 product page → 2.2/2.3 + 4.6/4.8 cart &
>   checkout.

Legend: `[B]` backend · `[S]` storefront · `[A]` admin · `[D]` deploy/infra.
Each task lists **Depends on** and **Done when**.

---

## Phase 0 — Repo & shared foundations

- **0.1 [D] Init monorepo.** Create `backend/`, `storefront/`, `admin/`, keep `docs/`,
  add root `.gitignore`, `README.md` (links to docs), `.editorconfig`.
  *Done when:* repo initialized, folders exist, first commit made.

- **0.2 [D] Extract design tokens.** From `10-DESIGN-SYSTEM.md`, create `tokens.css` and a
  shared `tailwind.config.js` snippet. (Copy into both frontends in their setup tasks.)
  *Done when:* token files exist and match the design system doc exactly.

---

## Phase 1 — Backend foundation (everything depends on this)

- **1.1 [B] Install Laravel + packages.** Per `20-BACKEND-PLAN.md` §1. Configure Pint,
  Larastan, Sanctum, spatie/permission, CORS. Commit `.env.example`.
  *Done when:* `php artisan serve` runs; `vendor/bin/pint --test` and Larastan pass.

- **1.2 [B] Enums.** `OrderStatus`, `IntendedUse`, `StaffRole`.
  *Done when:* enums compile and are referenced by casts later.

- **1.3 [B] Migrations + models.** All tables in `20-BACKEND-PLAN.md` §3 with UUID PKs,
  soft deletes, casts (money int, json, enums), and relationships. Roles/permissions
  seeded via spatie.
  *Depends on:* 1.1, 1.2. *Done when:* `php artisan migrate:fresh` succeeds; models have
  typed relationships/scopes.

- **1.4 [B] Factories + seeders.** `20-BACKEND-PLAN.md` §10 (staff, categories, ~40
  products w/ price_per_metre + stock_metres + offered lengths + images + suggestions,
  settings, coupons).
  *Depends on:* 1.3. *Done when:* `php artisan migrate:fresh --seed` yields realistic data;
  shirt products have pant suggestions wired.

- **1.5 [B] API Resources.** One per resource matching `50-API-CONTRACT.md` §1 exactly
  (paise fields, `*_url` for images, computed `in_stock`, `price_per_metre_paise`, and each
  ProductLength's computed `unit_price_paise`/`purchasable`, etc.).
  *Depends on:* 1.3. *Done when:* resource output matches the contract shapes.

- **1.6 [B] Auth — customer & staff.** Sanctum login/register/logout/me, password reset,
  email verify (customer); staff login/me/logout; role+permission gating middleware;
  ownership policies. Rate-limit auth.
  *Depends on:* 1.3. *Done when:* contract §4 & §6 endpoints work; employee blocked from
  admin-only routes (test).

---

## Phase 2 — Backend storefront-facing API

- **2.1 [B] Catalog read endpoints.** `/categories`, `/categories/{slug}`, `/products`
  (all filters/sort/search/pagination), `/products/{slug}`, `/products/{id}/suggestions`,
  `/settings/public`. (`50-API-CONTRACT.md` §2.) `SuggestionService` for curated pairings.
  *Depends on:* 1.5. *Done when:* filtering/sorting/pagination correct; shapes match.

- **2.2 [B] Cart.** `CartService` + endpoints (§3): items keyed by
  `{product_id, length_metres}`; computed unit price (per_metre × length); guest token +
  customer; add/update/remove; merge on login; **metre-stock validation**
  (`Σ(length × qty) ≤ stock_metres`); reject lengths not in `product_lengths`; totals.
  *Depends on:* 1.5. *Done when:* cart math correct; merge works; over-metre & invalid-
  length rejected.

- **2.3 [B] Checkout + payments.** `CheckoutService`, `PaymentGateway`+`RazorpayGateway`,
  `/checkout`, `/checkout/verify`, `/webhooks/razorpay`, `/coupons/validate`,
  order_number generation, **metre-stock decrement** (`length × qty`, with row lock) in a
  transaction, confirmation email.
  *Depends on:* 2.2. *Done when:* order created → Razorpay order returned → verify marks
  paid + decrements `stock_metres` (no overselling); duplicate webhook idempotent (tests
  pass).

- **2.4 [B] Customer account.** Profile, password, addresses CRUD, order history + detail
  (policy-guarded). (§4.)
  *Depends on:* 1.6, 2.3. *Done when:* a customer sees only their own orders/addresses.

---

## Phase 3 — Backend admin API

- **3.1 [B] Product/category/lengths/image CRUD.** Contract §7. Product carries
  `price_per_metre_paise` + `stock_metres`; `PUT .../lengths` replaces the offered length
  set. `ImageService` (WebP+thumb). Slug generation. FormRequests + Resources.
  *Depends on:* 1.5. *Done when:* full product lifecycle works incl. price/metre + stock,
  offered lengths, multi-image upload, set-primary, reorder.

- **3.2 [B] Suggestions config.** `PUT /admin/products/{id}/suggestions` (ordered replace)
  + `GET .../suggestion-candidates?complementary=1` using
  `SuggestionService::complementaryUses`.
  *Depends on:* 3.1. *Done when:* saving suggestions reflects on storefront endpoint;
  candidate filter returns complementary intended_use.

- **3.3 [B] Orders admin + labels.** List/detail/status/notes/refund; `GET .../label` and
  `POST .../labels/batch` (dompdf, Code128 barcode, 4×6 layout from
  `20-BACKEND-PLAN.md` §7). `print-labels` permission for employees.
  *Depends on:* 2.3. *Done when:* status transitions guarded; single+batch PDFs render;
  employee can print but not access admin-only routes.

- **3.4 [B] People / coupons / settings / dashboard.** Customers, staff CRUD (admin-only),
  coupons CRUD, settings get/update, dashboard KPIs. (§9.)
  *Depends on:* 1.6. *Done when:* contract §9 endpoints work with correct permissions.

- **3.5 [B] Storefront rebuild trigger.** `StorefrontRebuildService` (debounced
  `repository_dispatch`) wired to catalog mutations + `POST /admin/rebuild-storefront`.
  (`60-DEPLOYMENT.md` §6.)
  *Depends on:* 3.1. *Done when:* a product edit fires one GitHub dispatch (verify against
  a test repo / mock); debounce coalesces bursts.

- **3.6 [B] Feature tests + freeze contract.** Cover `20-BACKEND-PLAN.md` §11. Reconcile
  any drift with `50-API-CONTRACT.md`.
  *Done when:* tests green; contract matches implementation 1:1.

---

## Phase 4 — Storefront

- **4.1 [S] Project setup.** Astro + Tailwind + React + sitemap; tokens.css; fonts;
  ESLint/Prettier; `lib/` (api, types, format, cart, seo); env. (`30-STOREFRONT-PLAN.md`.)
  *Depends on:* 0.2, 2.1. *Done when:* dev server runs; `api.ts` fetches live products.

- **4.2 [S] Layout + UI components + SEO head.** BaseLayout, Header (with cart-count
  island stub), Footer, BaseHead, Breadcrumbs; UI components (Button, Card, Badge, Input)
  per design system; custom SVG logo/icons.
  *Depends on:* 4.1. *Done when:* shell renders responsively; meta tags present; no emojis.

- **4.3 [S] Home page.** Hero, featured categories, featured/new products, trust band,
  footer; org JSON-LD. Static from API.
  *Depends on:* 4.2. *Done when:* home renders real data, mobile-friendly, Lighthouse SEO
  ≥ 95.

- **4.4 [S] Category pages.** `getStaticPaths`, grid, filters/sort island, pagination,
  breadcrumbs, SEO.
  *Depends on:* 4.2. *Done when:* one static page per category; filters work; SEO correct.

- **4.5 [S] Product page (centerpiece).** Gallery island (slider when >1 image), length
  selector (chips → computed per-piece price + purchasable from stock_metres), per-metre
  price display, add-to-cart, "Pairs well with" suggestions, full SEO + Product/Breadcrumb
  JSON-LD. (`30-STOREFRONT-PLAN.md` §4.3.)
  *Depends on:* 4.2, 2.1. *Done when:* every product is a static page; JSON-LD validates in
  Google Rich Results test; gallery + length selection + computed price + suggestions work.

- **4.6 [S] Cart.** `lib/cart.ts` (nanostores + API sync), CartDrawer, AddToCart, cart
  page fallback, header cart count.
  *Depends on:* 4.5, 2.2. *Done when:* add/update/remove persist across reload; totals match
  backend.

- **4.7 [S] Auth + account.** login/register/forgot/reset islands; account profile,
  addresses, My Orders list + detail (login-gated client-side).
  *Depends on:* 4.6, 2.4. *Done when:* customer can sign in, see their orders/addresses.

- **4.8 [S] Checkout + confirmation.** CheckoutApp (address/shipping/review/Razorpay),
  verify, order-confirmation page. Guest + logged-in.
  *Depends on:* 4.6, 2.3. *Done when:* full purchase completes in test mode; confirmation
  shows order.

- **4.9 [S] Static pages + search + sitemap/robots + polish.** about/contact/policies,
  search island, sitemap integration, robots.txt, Lighthouse pass (perf+SEO+a11y).
  *Depends on:* 4.3. *Done when:* all pages present, responsive, SEO complete.

---

## Phase 5 — Admin

- **5.1 [A] Project setup.** Vite/React/TS + Tailwind + tokens + Query/Router/Zustand/
  RHF+Zod; `api/client.ts` + types; providers/router/guards; env.
  (`40-ADMIN-PLAN.md`.)
  *Depends on:* 0.2, 3.1. *Done when:* app builds; client hits API with token.

- **5.2 [A] Auth + guards + app shell.** LoginPage, auth store, RequireAuth/
  RequirePermission, AppShell (sidebar/topbar), permission-driven nav.
  *Depends on:* 5.1, 3.4. *Done when:* admin logs in, sees full nav; employee sees only
  Orders.

- **5.3 [A] UI component library.** `components/ui/*` per `40-ADMIN-PLAN.md` §6 (Table,
  Modal, Drawer, FileUpload, ImageGalleryManager, RichTextEditor, MoneyInput, Toast, etc.).
  *Depends on:* 5.2. *Done when:* components reusable, accessible, on-brand.

- **5.4 [A] Products list + form.** List (filter/sort/paginate); ProductForm with
  price/metre + stock_metres inputs, LengthEditor (offered lengths), ImageGalleryManager,
  SuggestionPicker (complementary pre-filter), SEO. Live per-piece price preview per length.
  *Depends on:* 5.3, 3.1, 3.2. *Done when:* full product CRUD incl. price/metre + stock +
  lengths + images + suggestions works; saving triggers rebuild.

- **5.5 [A] Categories CRUD.**
  *Depends on:* 5.3, 3.1. *Done when:* category CRUD + reorder works.

- **5.6 [A] Orders list + detail + labels.** List w/ filters + bulk select; detail w/
  status update, notes; **single + batch shipping sticker print/download**.
  *Depends on:* 5.3, 3.3. *Done when:* staff manage orders; employee can print stickers.

- **5.7 [A] People / coupons / settings / dashboard.** Customers, Staff (admin-only),
  Coupons, Settings (incl. manual rebuild button), Dashboard + charts.
  *Depends on:* 5.3, 3.4. *Done when:* contract §9 screens functional with role gating.

- **5.8 [A] Responsive + states pass.** Mobile tables/drawers; empty/loading/error states
  everywhere; a11y check.
  *Done when:* admin usable at 360/768/1024/1440 with no broken states.

---

## Phase 6 — Deployment

- **6.1 [D] cPanel setup.** Subdomains (api/admin), api docroot → `backend/public`,
  DB+user, SSL, `.htaccess` SPA fallbacks. (`60-DEPLOYMENT.md` §1, §5, §7.)
- **6.2 [D] GitHub Actions.** Add secrets; commit the three workflows + `.htaccess`.
- **6.3 [D] First deploy order.** Backend → migrate/seed → verify API; storefront build;
  admin build; Razorpay live keys + webhook.
- **6.4 [D] Verify auto-rebuild.** Edit a product in admin → confirm `rebuild-storefront`
  workflow runs and the change appears live in ~1–2 min.
  *Done when:* all three apps live on their hostnames over HTTPS; edit→rebuild loop works.

---

## Phase 7 — Hardening (ongoing)
- Lighthouse 95+ (storefront perf/SEO/a11y), JSON-LD validation, broken-link check.
- Security: CORS locked, `APP_DEBUG=false`, PAT scoped, payment signature verified,
  rate limits, input sanitization (rich text), file-upload validation.
- Backups (DB), error logging/monitoring, 404/500 pages on storefront.

---

## How a small model should work a task
1. Read `00-OVERVIEW.md` + the task's app plan + `50-API-CONTRACT.md`.
2. Implement ONLY the current task's scope. Match conventions (paise, UUID, naming, no
   emojis, TS strict / typed PHP).
3. Verify the "Done when" check (run it).
4. Run linters/formatters (Pint / ESLint+Prettier) and any tests for the area.
5. Commit with a conventional message scoped to the task (e.g.
   `feat(backend): product CRUD endpoints`).
6. If you discover the contract is wrong/missing something, STOP, update
   `50-API-CONTRACT.md` (+ backend plan), then continue.
