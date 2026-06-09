# Shree Krishna Collection — Master Plan & Overview

> **Read this first.** This is the index and shared contract for the entire project.
> Every other plan document depends on the conventions defined here. Do not deviate
> from naming, data shapes, or API contracts without updating this file first.

---

## 1. What we are building

An e-commerce platform for **Shree Krishna Collection**, a seller of **unstitched cloth
material** (fabric sold by length — e.g. 1.25m, 1.30m, 1.50m pieces that customers buy
and then get stitched into shirts, pants, suits, etc.).

The visual target is **Shopify-grade storefront quality — clean, modern, minimal** —
but it is our own custom build, not Shopify.

The system has **three separate applications**:

| App | Folder | Tech | Audience | SEO |
|-----|--------|------|----------|-----|
| **Storefront** | `/storefront` | Astro (static output) | Public shoppers + crawlers | Critical |
| **Admin Panel** | `/admin` | React SPA (Vite) | Owner + employees (login-gated) | None |
| **Backend API** | `/backend` | Laravel 11 + MySQL | Serves both apps via REST/JSON | N/A |

These live in **one git repository (monorepo)** with three top-level folders. Each can be
built and deployed independently.

---

## 2. The core domain — understand this before coding anything

This is **cloth material**, not finished garments. The mental model:

- A **Product** is a piece/run of fabric (e.g. "Premium Cotton Shirting — Sky Blue").
- It has a **fabric type** the cloth is *meant for*: `shirt`, `pant`, `suit`, `kurta`, etc.
  (We call this `intended_use`.)
- It is priced **per metre** (one `price_per_metre` per cloth) and the customer picks a
  **length** from a fixed list the admin defines (1.25, 1.30, 1.50, …). The price of a
  piece is **strictly `price_per_metre × length`** (linear, no per-length prices/overrides).
- **Stock is a single pool measured in metres** (`stock_metres`) per cloth; buying a length
  deducts that many metres. A length is purchasable only if `stock_metres ≥ length`.
- The **main photo is the cloth swatch itself.** If the admin uploads more than one
  photo, the product page shows an **image slider/gallery**.

### Pairing suggestions (a key feature)

After viewing/adding/buying a product, we suggest **complementary cloth** — but
intelligently by intended use:

- If a customer is looking at **shirt cloth**, we suggest **pant cloth** (and/or matching
  colors/materials) — i.e. things that *pair* with a shirt, NOT more shirt cloth.
- These suggestions are **manually configured per-product in the admin panel** (admin
  picks which products to recommend alongside each product). We do NOT auto-generate them
  from an algorithm in v1 — the admin curates them. The data model supports this via a
  `product_suggestions` pivot table (see backend plan).

> When in doubt about the domain, re-read this section. "Product = a cloth for an intended
> garment, priced per metre, sold in a fixed set of selectable lengths from one metre-based
> stock pool, with curated pairing suggestions."

---

## 3. Brand identity (shared by storefront + admin)

| Token | Value | Notes |
|-------|-------|-------|
| Brand name | **Shree Krishna Collection** | Always full name in titles/SEO |
| Short name | **SKC** | For compact UI (logo mark, mobile header) |
| Primary color | `#1E3A5F` (deep indigo) | Trust, premium textile feel |
| Accent color | `#C9A227` (muted gold) | CTAs, highlights — evokes traditional textile |
| Background | `#FFFFFF` | Clean, Shopify-like |
| Surface / card | `#F7F6F3` (warm off-white) | Subtle warmth |
| Text primary | `#1A1A1A` | |
| Text muted | `#6B6B6B` | |
| Success | `#2E7D5B` | |
| Error | `#C0392B` | |
| Border | `#E5E3DE` | |
| Font (headings) | **"Fraunces"** (serif) | Elegant, premium |
| Font (body/UI) | **"Inter"** (sans) | Clean, legible |
| Radius | `8px` default, `12px` cards | |
| Max content width | `1280px` | |

> These exact values live in `docs/10-DESIGN-SYSTEM.md` as copy-paste design tokens
> (CSS variables + Tailwind config). Storefront and admin both import the same tokens.

**Logo:** A custom SVG wordmark + a peacock-feather-inspired mark (Krishna association),
kept minimal and modern. Spec in the design system doc. **No emojis anywhere** in any UI,
ever — use SVG icons (Lucide icon set as the base, custom SVGs where needed).

---

## 4. Repository layout

```
e-commerce/
├── docs/                      # All planning docs (this folder)
│   ├── 00-OVERVIEW.md         # ← you are here
│   ├── 10-DESIGN-SYSTEM.md    # Shared design tokens, components, SVG/logo specs
│   ├── 20-BACKEND-PLAN.md     # Laravel + MySQL: schema, API, auth, modules
│   ├── 30-STOREFRONT-PLAN.md  # Astro storefront: pages, SEO, data fetching
│   ├── 40-ADMIN-PLAN.md       # React admin SPA: screens, roles, features
│   ├── 50-API-CONTRACT.md     # Canonical REST endpoint reference (shared truth)
│   ├── 60-DEPLOYMENT.md       # cPanel/MilesWeb deploy + GitHub Actions CI/CD
│   └── 70-BUILD-ORDER.md      # Step-by-step task breakdown for implementers
├── backend/                   # Laravel app
├── storefront/                # Astro app
├── admin/                     # React (Vite) app
└── .github/workflows/         # CI/CD pipelines
```

---

## 5. How the three apps talk to each other

```
                          ┌─────────────────────────────┐
                          │  Backend API (Laravel/MySQL) │
                          │  https://api.skc...           │
                          └──────┬──────────────┬─────────┘
                  build-time     │              │   runtime (XHR/fetch)
                  fetch (SSG)    │              │   + on save → CI trigger
                                 ▼              ▼
              ┌──────────────────────┐   ┌──────────────────────┐
              │ Storefront (Astro)   │   │ Admin Panel (React)  │
              │ static HTML on cPanel│   │ SPA on admin.subdomain│
              │ public, SEO          │   │ login-gated, no SEO  │
              └──────────────────────┘   └──────────────────────┘
```

- **Storefront** reads the catalog from the backend **at build time** to generate static
  HTML (best SEO/speed). Truly dynamic bits (cart, checkout, live stock check) call the
  backend API client-side from small interactive "islands."
- **Admin panel** is a normal SPA: every screen calls the backend API at runtime with a
  bearer token.
- When the admin changes the catalog (add/edit/remove product or category), the backend
  fires a **`repository_dispatch` webhook to GitHub**, which rebuilds + redeploys the
  storefront (see `60-DEPLOYMENT.md`). Edits go live in ~1–2 min as static pages.

---

## 6. Global conventions (ALL implementers must follow)

### API
- Base URL configured via env var. Storefront: `PUBLIC_API_URL`. Admin: `VITE_API_URL`.
- All responses are JSON. All list endpoints are **paginated** and **wrapped**:
  ```json
  { "data": [...], "meta": { "current_page": 1, "last_page": 5, "per_page": 20, "total": 92 } }
  ```
- Single-resource responses: `{ "data": { ... } }`.
- Errors use Laravel's standard shape:
  ```json
  { "message": "The given data was invalid.", "errors": { "field": ["msg"] } }
  ```
- Auth: **Laravel Sanctum** bearer tokens. Admin/storefront send
  `Authorization: Bearer <token>`. Storefront customer auth is token-based too.
- Money: integers in **paise** (₹1 = 100 paise) everywhere in the API to avoid float
  errors. Format to ₹ only in the UI. Field names end in `_paise` (e.g.
  `price_per_metre_paise`).
- Dates: ISO 8601 UTC strings. Format in UI per user locale (default `en-IN`).
- IDs: backend uses **UUIDv4** primary keys for public-facing resources (products,
  orders) so IDs aren't guessable; internal-only tables may use bigint.
- Slugs: every product and category has a unique, URL-safe `slug`. Storefront URLs use
  slugs, never numeric IDs.

### Code quality (non-negotiable — applies to all three apps)
- **TypeScript** for storefront + admin (strict mode on). **PHP 8.3 typed** for backend.
- **Linting/formatting committed and enforced:** ESLint + Prettier (JS/TS),
  Laravel Pint (PHP). Config files provided in each plan.
- **No `any`** in TS unless justified with a comment. **No emojis** in code or UI.
- **Components are small and single-purpose.** Reuse shared UI; don't copy-paste.
- **All forms validated** both client-side (UX) and server-side (truth).
- **Accessibility:** semantic HTML, alt text on every image, focus states, ARIA where
  needed, color contrast ≥ WCAG AA. Keyboard-navigable.
- **Mobile-first responsive** on every page. Test at 360px, 768px, 1024px, 1440px.
- **Environment-driven config** — no hardcoded URLs, keys, or secrets in code. `.env`
  files, `.env.example` committed (with empty values).
- **Commit messages:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).

### Naming
- Files: kebab-case for assets/configs; framework-idiomatic for components
  (PascalCase React components, kebab Astro files).
- DB tables: snake_case plural (`products`, `order_items`). Columns: snake_case.
- API routes: kebab-case plural nouns (`/api/products`, `/api/order-items`).
- TS types mirror API resources with PascalCase (`Product`, `OrderItem`).

---

## 7. Feature checklist (definition of "complete")

### Storefront (customer)
- [ ] Home page (hero, featured categories, featured/new products)
- [ ] Category listing pages (filter by intended_use, material, color, price; sort)
- [ ] Product detail page (image slider, length selector, per-metre price + computed
      per-piece price, stock,
      add-to-cart, pairing suggestions, SEO + JSON-LD)
- [ ] Search
- [ ] Cart (persisted; guest + logged-in)
- [ ] Customer auth: sign up, login, logout, password reset, email verify
- [ ] Checkout (address, shipping, payment integration)
- [ ] Payment integration (Razorpay — India-appropriate; see backend plan)
- [ ] Order confirmation page
- [ ] My Account: profile, addresses, order history ("My Orders"), order detail
- [ ] Static pages: About, Contact, Shipping policy, Returns, Privacy, T&C
- [ ] Fully responsive + SEO (meta, sitemap, robots, JSON-LD) on every page

### Admin Panel
- [ ] Staff auth (admin + employee roles), login, logout
- [ ] Dashboard (sales summary, recent orders, low stock)
- [ ] Product CRUD (incl. multi-image upload, price/metre + metre-stock, offered lengths,
      intended_use,
      pairing-suggestion configurator)
- [ ] Category CRUD
- [ ] Order management (list, filter, view, update status)
- [ ] **Shipping sticker generation + print/download (employee-accessible)**
- [ ] Customer list/view
- [ ] Staff/employee management (admin only)
- [ ] Inventory/stock management
- [ ] Coupons/discounts (basic)
- [ ] Settings (store info, shipping rates, etc.)
- [ ] Triggers storefront rebuild on catalog change

### Backend
- [ ] All of the above as well-tested REST endpoints
- [ ] Role-based authorization (admin / employee / customer)
- [ ] Payment webhook handling
- [ ] Image storage + processing
- [ ] `repository_dispatch` trigger to GitHub on catalog change
- [ ] Seeders for demo data; factories; feature tests for critical paths

---

## 8. Build order (high level)

Detailed task-by-task in `70-BUILD-ORDER.md`. The sequence is:

1. **Backend foundation** — Laravel install, DB schema/migrations, models, auth,
   seeders. (Everything else depends on the API existing.)
2. **API contract freeze** — confirm `50-API-CONTRACT.md` matches reality.
3. **Design system** — implement shared tokens (`10-DESIGN-SYSTEM.md`) in both frontends.
4. **Storefront foundation** — Astro setup, layout, design tokens, home + product +
   category pages reading from API.
5. **Admin foundation** — Vite/React setup, auth, layout, then CRUD screens.
6. **Cross-cutting** — payments, shipping stickers, suggestions, SEO polish.
7. **Deployment** — CI/CD per `60-DEPLOYMENT.md`.

> **For smaller models:** always read `00-OVERVIEW.md` (this file), the relevant app plan,
> AND `50-API-CONTRACT.md` before writing code. Never invent an endpoint or field name —
> if it's not in the contract, stop and add it to the contract first.
