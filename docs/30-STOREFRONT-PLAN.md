# Storefront Plan — Astro (static output)

> Public, SEO-critical shopping site. Static HTML built from the backend API. Read
> `00-OVERVIEW.md`, `10-DESIGN-SYSTEM.md`, and `50-API-CONTRACT.md` before coding.

---

## 1. Stack & why

- **Astro 4** with `output: 'static'` (SSG). Pages are pre-rendered to plain HTML →
  best SEO + Core Web Vitals, and deployable to cPanel as static files (no Node runtime).
- **Tailwind CSS** (`@astrojs/tailwind`) + shared design tokens (`10-DESIGN-SYSTEM.md`).
- **Interactive islands** for the few dynamic pieces. Use **React** islands
  (`@astrojs/react`) so we share component patterns with the admin app. Keep islands
  small — most of the page stays zero-JS HTML.
- **@astrojs/sitemap** for sitemap.xml. Manual `robots.txt`.
- **@astrojs/image / astro:assets** for optimized responsive images.
- **TypeScript strict**. ESLint + Prettier + `eslint-plugin-astro`.

### What is static vs. client-side
| Concern | How |
|---------|-----|
| Home, category, product, static pages | **Static HTML** (built from API) — full SEO |
| Product price/stock shown in HTML | Baked at build time (rebuild on change) |
| Live stock re-check, add-to-cart, cart drawer | **React island**, calls API at runtime |
| Search results | React island (calls API) OR a static search index — see §6 |
| Auth, account, checkout, my-orders | **Client-rendered island pages** (no SEO needed) |

> The catalog text/price IS in the static HTML (for SEO). Cart/checkout/account are
> behind interaction/login so they can be client-rendered without hurting SEO.

### Install
```bash
npm create astro@latest storefront -- --template minimal --typescript strict
cd storefront
npx astro add tailwind react sitemap
npm i @fontsource/inter @fontsource/fraunces lucide-react
npm i -D eslint prettier eslint-plugin-astro prettier-plugin-astro @typescript-eslint/parser
```

---

## 2. Folder structure

```
storefront/src/
├── assets/
│   ├── icons/            # custom SVGs (logo, cloth, ruler, stitch) + README
│   └── images/
├── components/
│   ├── ui/               # Button.astro, Badge.astro, Card.astro, Input ... (design system)
│   ├── layout/           # Header.astro, Footer.astro, MobileNav, Breadcrumbs
│   ├── product/          # ProductCard.astro, ProductGrid.astro, PriceTag.astro,
│   │                     # IntendedUseBadge.astro
│   ├── islands/          # React islands (.tsx):
│   │   ├── ProductGallery.tsx     # image slider (multi-image)
│   │   ├── LengthSelector.tsx     # length chips + computed per-piece price + stock
│   │   ├── AddToCart.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── SearchBox.tsx
│   │   ├── AccountApp.tsx          # account/orders SPA-ish island
│   │   └── CheckoutApp.tsx
│   └── seo/
│       ├── BaseHead.astro          # title, meta, OG, canonical, fonts
│       └── ProductJsonLd.astro     # JSON-LD Product schema
├── layouts/
│   ├── BaseLayout.astro            # header+footer+BaseHead wrapper
│   └── AccountLayout.astro
├── lib/
│   ├── api.ts            # typed fetch wrapper (build-time + client)
│   ├── types.ts          # shared TS types mirroring API resources
│   ├── cart.ts           # client cart store (nanostores) + API sync
│   ├── format.ts         # money (paise→₹), dates, slugs
│   └── seo.ts            # helpers to build meta/jsonld
├── pages/
│   ├── index.astro                 # Home
│   ├── category/[slug].astro       # Category listing (getStaticPaths)
│   ├── product/[slug].astro        # Product detail (getStaticPaths)
│   ├── search.astro                # Search (island)
│   ├── cart.astro                  # Cart page (island)  [drawer is primary, page is fallback]
│   ├── checkout.astro              # Checkout (island, client-rendered)
│   ├── account/
│   │   ├── index.astro             # profile (island)
│   │   ├── orders.astro            # My Orders (island)
│   │   └── orders/[id].astro       # order detail (island; client fetch by id)
│   ├── auth/
│   │   ├── login.astro  register.astro  forgot-password.astro  reset-password.astro
│   ├── order-confirmation/[number].astro
│   ├── about.astro contact.astro
│   └── policies/{shipping,returns,privacy,terms}.astro
├── styles/
│   └── tokens.css        # CSS variables from design system
└── env.d.ts
```

---

## 3. Data fetching

### Build time (SSG)
- `lib/api.ts` exposes typed functions: `getProducts`, `getProduct(slug)`,
  `getCategories`, `getCategory(slug)`, `getSuggestions(productId)`, etc.
- `getStaticPaths()` in `product/[slug].astro` and `category/[slug].astro` fetches all
  products/categories and returns one route per slug, passing the full data as props so no
  client fetch is needed for the main content.
- Handle build-time errors gracefully (fail the build if the API is down — better than
  shipping empty pages).

### Runtime (client)
- Same `api.ts` works client-side for islands (cart, auth, checkout, account, live stock).
- Client requests attach the customer bearer token (from localStorage) when present.
- Configure `PUBLIC_API_URL` env (Astro exposes `PUBLIC_*` to the client).

### `lib/types.ts`
Mirror the API resources exactly (Product, ProductLength, ProductImage, Category, Cart,
Order, etc.) — keep in sync with `50-API-CONTRACT.md`. These types are the client contract.

---

## 4. Page specs

### 4.1 Home (`index.astro`)
- Sticky header (logo, nav: categories dropdown, search, account, cart-count island).
- Hero: brand statement ("Premium unstitched cloth, ready to be stitched your way"),
  one strong image, CTA to shop. Fraunces headline.
- Featured categories (cards with image).
- Featured products grid (from `is_featured`).
- New arrivals grid.
- Trust band (shipping, easy returns, secure payment — SVG icons, no emoji).
- Footer (links, policies, contact, social SVGs, newsletter input).
- SEO: organization JSON-LD, full meta.

### 4.2 Category (`category/[slug].astro`)
- Breadcrumbs (Home / Category).
- Title + description.
- **Filters** (client island that refines the statically-rendered list, OR re-fetches):
  intended_use, material, color, price range. **Sort:** newest, price asc/desc.
  - Simplest correct approach: render all category products statically; the filter island
    filters the already-present DOM/data client-side (instant, no API). Good for catalogs
    up to a few hundred per category.
- Product grid (`ProductGrid` of `ProductCard`). Pagination if large.
- Mobile: filters in a bottom sheet/drawer.
- SEO: category meta (use `meta_title`/`meta_description` overrides if set), `ItemList`
  JSON-LD optional.

### 4.3 Product detail (`product/[slug].astro`) — the centerpiece
Layout: two columns desktop (gallery left, info right), stacked mobile.

- **Gallery island (`ProductGallery.tsx`)**: if 1 image → static `<img>`; if >1 →
  slider with thumbnails, swipe on mobile, keyboard arrows, lazy-loaded. Primary image
  first. All images have alt text.
- **Info column:**
  - Breadcrumbs, product name (H1, Fraunces), intended_use badge, material/color/pattern.
  - Color swatch (from `color_hex`).
  - Show the **price per metre** prominently (e.g. "₹400 / metre"), with
    `compare_at_per_metre` strikethrough when discounted.
  - **`LengthSelector.tsx`**: the product's offered lengths (from `product.lengths`, e.g.
    1.25 m / 1.30 m / 1.50 m) as selectable chips. Selecting a length shows the **computed
    total for that piece** = `unit_price_paise` from the chosen `ProductLength`
    (per_metre × length) — display it big (e.g. "1.50 m → ₹600"). Disable a chip if
    `purchasable` is false (not enough `stock_metres`). On mount, optionally re-fetch the
    product to get live `stock_metres`/`purchasable`.
  - **`AddToCart.tsx`**: quantity stepper + Add to cart. Sends
    `{ product_id, length_metres, quantity }`. Disabled until a length is selected and it's
    purchasable; also guard against quantity exceeding available metres
    (`length × qty ≤ stock_metres`). Updates cart store + opens drawer. "Buy now" →
    checkout.
  - Short "get it stitched" helper note (with stitch SVG) explaining the cloth is sold by
    length, unstitched.
  - Description (rich text, sanitized).
- **Pairing suggestions section** ("Pairs well with") — renders curated
  `getSuggestions(productId)` as a `ProductGrid`. This is the shirt→pant feature. If empty,
  hide the section. These are baked statically (admin-curated, changes on rebuild).
- **SEO (critical):**
  - `BaseHead` with product `meta_title`/`name`, `meta_description`/excerpt, canonical.
  - OG image = primary product image.
  - **`ProductJsonLd.astro`** emitting schema.org `Product` with `name`, `image`,
    `description`, `sku`, `brand` (Shree Krishna Collection), and `offers`
    (`AggregateOffer` across the offered lengths: `lowPrice` = per_metre × smallest length,
    `highPrice` = per_metre × largest length, `priceCurrency: INR`, `availability` from
    `in_stock`/`stock_metres`). This drives Google rich results (price/availability).
  - Breadcrumb JSON-LD.

### 4.4 Search (`search.astro`)
- `SearchBox.tsx` island queries `GET /api/products?search=` (debounced) and renders
  results. Provide a static, crawlable fallback message. (Search pages typically
  `noindex` — fine.)

### 4.5 Cart
- Primary UX: **CartDrawer** island (right drawer desktop, full sheet mobile), opened from
  header cart icon. Shows items (image, name, length, qty stepper, line total), subtotal,
  "Checkout" CTA. Edit qty / remove inline.
- `cart.astro` is a full-page fallback with the same data.
- Cart state in `lib/cart.ts` using **nanostores** (`@nanostores/persistent`) so it
  survives reloads; synced to backend cart (guest token or customer) via API.

### 4.6 Checkout (`checkout.astro`, `CheckoutApp.tsx`)
- Client-rendered (no SEO). Steps: contact/email → shipping address (saved addresses if
  logged in, else form) → shipping method/cost → review → **Razorpay** payment.
- Calls `POST /api/checkout` → opens Razorpay → `POST /api/checkout/verify` → redirect to
  `order-confirmation/[number]`.
- Guest checkout allowed; offer account creation after.
- Robust validation, loading/disabled states, error handling, never double-charge
  (disable button while processing).

### 4.7 Order confirmation (`order-confirmation/[number].astro`)
- Client fetches the order by number (or receives via state) and shows summary, items,
  total, shipping address, next steps. Thank-you message.

### 4.8 Account (islands, login-gated client-side)
- `account/index` profile edit; `account/orders` My Orders list (status badges);
  `account/orders/[id]` order detail (items, status timeline, address, reorder).
- Redirect to login if no token.

### 4.9 Auth pages
- login / register / forgot-password / reset-password — forms calling the auth API,
  storing token, then redirecting. Client-validated + server-validated.

### 4.10 Static content pages
- about, contact (with form → API or mailto), policies (shipping/returns/privacy/terms).
  Plain Astro, fully SEO'd.

---

## 5. SEO implementation (this is the whole point — get it right)

`components/seo/BaseHead.astro` accepts props and renders:
- `<title>` (≤ 60 chars), `<meta name="description">` (≤ 160).
- Canonical `<link rel="canonical">` (absolute URL, from `Astro.site`).
- Open Graph (`og:title/description/image/type/url`) + Twitter card.
- `<meta name="robots">` (index for catalog, noindex for search/account/checkout).
- Preconnect/self-host fonts; theme-color.
- Favicon + manifest links.

Global:
- `astro.config.mjs`: set `site: 'https://www.shreekrishnacollection.com'` (env-driven),
  enable sitemap integration (auto sitemap.xml).
- `public/robots.txt`: allow all, point to sitemap, disallow `/account`, `/checkout`,
  `/cart`, `/search`.
- JSON-LD: Organization (home), Product + Breadcrumb (product), optional ItemList
  (category). Helpers in `lib/seo.ts`.
- Image SEO: descriptive `alt`, responsive `srcset` via `astro:assets`, lazy loading,
  WebP. Largest hero/product image is the LCP — prioritize it (`loading="eager"`,
  preloaded) for good Core Web Vitals.
- Performance budget: keep JS minimal (islands only), no layout shift (reserve image
  dimensions), fonts `font-display: swap`.

---

## 6. Search index option
If client search by API is undesirable at scale, build a static JSON index at build time
(`/search-index.json` with id/name/slug/category/use/price) and search it client-side
(Fuse.js). Decide based on catalog size; API search is the default for v1.

---

## 7. Responsive & a11y
- Mobile-first; test 360/768/1024/1440. Header collapses to a drawer nav on mobile.
- Gallery: swipeable on touch. Filters: bottom sheet on mobile.
- Follow `10-DESIGN-SYSTEM.md` §8 a11y checklist on every page.

---

## 8. Env (`.env` / `.env.example`)
```
PUBLIC_API_URL=https://api.shreekrishnacollection.com/api
PUBLIC_SITE_URL=https://www.shreekrishnacollection.com
PUBLIC_RAZORPAY_KEY_ID=        # public key id only
```

---

## 9. What an implementer produces, in order
1. Astro + Tailwind + React + sitemap setup; tokens.css; fonts; ESLint/Prettier.
2. `lib/` (api, types, format, cart, seo). BaseLayout, Header, Footer, BaseHead.
3. UI components (Button, Card, Badge, Input, etc.) per design system.
4. Home page (static, from API).
5. Category + Product pages with getStaticPaths, gallery, length selector, suggestions,
   full SEO + JSON-LD.
6. Cart store + CartDrawer + AddToCart.
7. Auth islands + account/orders pages.
8. Checkout + Razorpay + confirmation.
9. Static pages, search, sitemap/robots, polish + Lighthouse pass (aim 95+ SEO/perf).

> Never invent API fields. Match `50-API-CONTRACT.md`. Money is paise — format with
> `lib/format.ts`. No emojis — use SVG icons.
