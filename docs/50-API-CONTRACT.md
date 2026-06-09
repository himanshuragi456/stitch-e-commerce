# API Contract — Canonical REST Reference

> **Single source of truth** for all endpoints. Backend implements these; storefront and
> admin consume them. **No app may use an endpoint/field not listed here.** If you need a
> new one, add it here first (and to the backend plan), then implement.
>
> Conventions (from `00-OVERVIEW.md` §6): JSON only; lists wrapped in `{data, meta}`;
> single in `{data}`; errors `{message, errors}`; money in integer `*_paise`; UUID ids;
> ISO-8601 dates; Sanctum bearer auth.

Base path: `/api`. Auth header where required: `Authorization: Bearer <token>`.

---

## 1. Resource shapes (JSON)

### Category
```json
{
  "id": "uuid", "name": "Shirting", "slug": "shirting",
  "description": "string|null", "parent_id": "uuid|null",
  "image_url": "string|null", "position": 0, "is_active": true,
  "product_count": 12,
  "meta_title": "string|null", "meta_description": "string|null"
}
```

### ProductLength (a selectable length chip)
```json
{
  "id": "uuid", "length_metres": "1.50", "position": 0,
  "unit_price_paise": 60000,   // COMPUTED = price_per_metre_paise × length_metres
  "purchasable": true          // true iff stock_metres >= length_metres
}
```
> `unit_price_paise` is computed by the backend and returned for convenience (so the
> frontend never multiplies/rounds inconsistently). No per-length stored price exists.

### ProductImage
```json
{ "id": "uuid", "url": "string", "thumb_url": "string",
  "alt": "string|null", "is_primary": true, "position": 0 }
```

### Product (list item — compact)
```json
{
  "id": "uuid", "name": "Premium Cotton Shirting — Sky Blue", "slug": "...",
  "category": { "id": "uuid", "name": "Shirting", "slug": "shirting" },
  "intended_use": "shirt", "material": "Cotton", "color": "Sky Blue",
  "color_hex": "#8EC5E8", "pattern": "Solid",
  "primary_image": { "url": "...", "thumb_url": "...", "alt": "..." },
  "price_per_metre_paise": 40000,
  "compare_at_per_metre_paise": 50000,   // null if not discounted
  "in_stock": true,                       // stock_metres > 0 (and at least one length purchasable)
  "is_featured": false
}
```
> Cards show "₹400 / metre" (and optionally "from ₹500" using the smallest offered length).

### Product (detail — full) — extends list item with:
```json
{
  "description": "sanitized html|null",
  "stock_metres": "48.50",
  "images": [ ProductImage, ... ],
  "lengths": [ ProductLength, ... ],     // the fixed, ordered list of selectable lengths
  "meta_title": "string|null", "meta_description": "string|null",
  "created_at": "iso", "updated_at": "iso"
}
```
> `suggestions` are fetched via a separate endpoint (or included on detail as
> `"suggestions": [Product-compact,...]` — backend MAY embed; storefront should support
> both: prefer embedded, fall back to the suggestions endpoint).

### CartItem / Cart
```json
// Cart
{
  "id": "uuid", "token": "string|null",
  "items": [
    { "id": "uuid", "quantity": 2,
      "length_metres": "1.50",
      "unit_price_paise": 60000,         // computed = per_metre × length
      "line_total_paise": 120000,        // unit × quantity
      "product": { "id":"uuid","name":"...","slug":"...",
                   "price_per_metre_paise":40000,
                   "primary_image": { "thumb_url":"...","alt":"..." } },
      "available": true }                // length still offered & enough stock_metres
  ],
  "subtotal_paise": 120000, "item_count": 2
}
```

### Address
```json
{ "id":"uuid","label":"Home","name":"...","phone":"...","line1":"...",
  "line2":"string|null","city":"...","state":"...","pincode":"...",
  "country":"IN","is_default":true }
```

### Order (detail)
```json
{
  "id":"uuid","order_number":"SKC-2026-00042","status":"paid",
  "payment_status":"paid","payment_method":"razorpay",
  "subtotal_paise":99800,"shipping_paise":5000,"discount_paise":0,
  "total_paise":104800,
  "customer_email":"...","customer_phone":"...",
  "shipping_address": Address-snapshot, "billing_address": Address-snapshot|null,
  "items":[
    {"id":"uuid","product_name":"...","length_metres":"1.50",
     "price_per_metre_paise":40000,"sku":"...",
     "unit_price_paise":60000,"quantity":2,"line_total_paise":120000}
  ],
  "placed_at":"iso","created_at":"iso"
}
```

### Order (list item) — compact subset:
`id, order_number, status, payment_status, total_paise, item_count, customer_email, placed_at`

### Staff
```json
{ "id":"uuid","name":"...","email":"...","role":"admin|employee",
  "permissions":["view-orders","print-labels"],"is_active":true,
  "last_login_at":"iso|null" }
```

### Coupon / Setting / Customer — straightforward mirrors of their tables (see backend
plan); list/detail follow the same wrapping conventions.

---

## 2. Storefront — public (no auth)

| Method | Path | Purpose | Query/Body |
|--------|------|---------|------------|
| GET | `/categories` | list active categories (+ tree) | `?tree=1` optional |
| GET | `/categories/{slug}` | category detail | |
| GET | `/products` | list/filter products | `?category=slug&intended_use=&material=&color=&min_price=&max_price=&sort=newest|price_asc|price_desc&search=&page=&per_page=` |
| GET | `/products/{slug}` | product detail (full) | |
| GET | `/products/{id}/suggestions` | curated pairing products | returns `{data:[Product-compact]}` |
| GET | `/search` | search (alias of products?search=) | `?q=` |
| GET | `/settings/public` | public store settings (shipping rate, threshold, contact, socials) | |

> All filters combinable. Prices in paise. `sort` default `newest`.

---

## 3. Storefront — cart (guest or customer)

Guest carts identified by a `X-Cart-Token` header (client-generated UUID, stored locally)
OR by auth token when logged in. Backend resolves accordingly.

| Method | Path | Body |
|--------|------|------|
| GET | `/cart` | — (uses cart token / auth) |
| POST | `/cart/items` | `{ product_id, length_metres, quantity }` |
| PATCH | `/cart/items/{id}` | `{ quantity }` |
| DELETE | `/cart/items/{id}` | — |
| POST | `/cart/merge` | `{ guest_cart_token }` (after login) |

---

## 4. Storefront — customer auth & account

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/auth/register` | — | `{ name, email, password, password_confirmation }` |
| POST | `/auth/login` | — | `{ email, password }` → `{ token, customer }` |
| POST | `/auth/logout` | customer | — |
| GET | `/auth/me` | customer | — → `{ customer }` |
| POST | `/auth/forgot-password` | — | `{ email }` |
| POST | `/auth/reset-password` | — | `{ token, email, password, password_confirmation }` |
| POST | `/auth/email/verify/{id}/{hash}` | — | (signed) |
| PATCH | `/account/profile` | customer | `{ name, phone }` |
| PATCH | `/account/password` | customer | `{ current_password, password, password_confirmation }` |
| GET | `/account/addresses` | customer | |
| POST | `/account/addresses` | customer | Address fields |
| PATCH | `/account/addresses/{id}` | customer | Address fields |
| DELETE | `/account/addresses/{id}` | customer | |
| GET | `/account/orders` | customer | list (paginated) |
| GET | `/account/orders/{id}` | customer | own order detail (policy-guarded) |

---

## 5. Storefront — checkout & payment

| Method | Path | Auth | Body / Returns |
|--------|------|------|----------------|
| POST | `/checkout` | optional | `{ email, phone, shipping_address{...}, billing_address?{...}, coupon_code?, cart_token? }` → `{ order, razorpay:{ key_id, razorpay_order_id, amount_paise, currency } }` |
| POST | `/checkout/verify` | optional | `{ order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature }` → `{ order }` (status paid) |
| GET | `/orders/{number}/public` | optional | confirmation lookup by order_number (rate-limited; requires matching email or recent session) |
| POST | `/webhooks/razorpay` | gateway-signed | Razorpay → backend (idempotent) |
| POST | `/coupons/validate` | optional | `{ code, cart_token? }` → `{ valid, discount_paise, message }` |

---

## 6. Admin — auth (staff)

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/admin/auth/login` | — | `{ email, password }` → `{ token, staff }` (staff incl. role+permissions) |
| POST | `/admin/auth/logout` | staff | — |
| GET | `/admin/auth/me` | staff | → `{ staff }` |

All `/admin/*` below require staff auth + the noted permission.

---

## 7. Admin — catalog

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/admin/products` | manage-products | list (filter/sort/paginate) |
| POST | `/admin/products` | manage-products | create → body incl. `price_per_metre_paise`, `compare_at_per_metre_paise?`, `stock_metres`, basics |
| GET | `/admin/products/{id}` | manage-products | full detail incl. lengths/images/suggestions |
| PATCH | `/admin/products/{id}` | manage-products | update basics + `price_per_metre_paise` + `stock_metres` |
| DELETE | `/admin/products/{id}` | manage-products | soft delete |
| PUT | `/admin/products/{id}/lengths` | manage-products | replace the offered length set: `{ lengths: [ {length_metres, position}, ... ] }` |
| POST | `/admin/products/{id}/images` | manage-products | multipart upload (1+ files) |
| PATCH | `/admin/products/{id}/images/{iid}` | manage-products | set primary / alt / position |
| DELETE | `/admin/products/{id}/images/{iid}` | manage-products | |
| PUT | `/admin/products/{id}/suggestions` | manage-products | `{ suggested_product_ids: [ordered uuids] }` (replace set) |
| GET | `/admin/products/{id}/suggestion-candidates` | manage-products | `?complementary=1` → products filtered to complementary intended_use |
| GET | `/admin/categories` | manage-products | |
| POST/PATCH/DELETE | `/admin/categories[/ {id}]` | manage-products | CRUD + position |

> Any successful create/update/delete on products or categories triggers a debounced
> storefront rebuild server-side (see `60-DEPLOYMENT.md`).

---

## 8. Admin — orders & labels

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/admin/orders` | view-orders | list (filter: status, payment_status, date range; search) |
| GET | `/admin/orders/{id}` | view-orders | detail |
| PATCH | `/admin/orders/{id}/status` | view-orders | `{ status }` (guarded transitions) |
| POST | `/admin/orders/{id}/refund` | manage-orders | admin-only refund |
| PATCH | `/admin/orders/{id}/notes` | view-orders | `{ notes }` |
| GET | `/admin/orders/{id}/label` | print-labels | → PDF (single shipping sticker) |
| POST | `/admin/orders/labels/batch` | print-labels | `{ order_ids:[...] }` → multi-page PDF |

> **Employees** hold `view-orders` + `print-labels` → can list/view orders, update status,
> and print/download stickers. Nothing else.

---

## 9. Admin — people, coupons, settings, dashboard

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/dashboard` | view-orders | KPIs, recent orders, low stock, sales series |
| GET | `/admin/customers[/ {id}]` | manage-customers | list/detail |
| GET/POST/PATCH/DELETE | `/admin/staff[/ {id}]` | manage-staff | admin-only staff CRUD |
| PATCH | `/admin/staff/{id}/password` | manage-staff | reset staff password |
| GET/POST/PATCH/DELETE | `/admin/coupons[/ {id}]` | manage-products | |
| GET | `/admin/settings` | manage-settings | all settings |
| PATCH | `/admin/settings` | manage-settings | update settings (keys) |
| POST | `/admin/rebuild-storefront` | manage-settings | manual rebuild trigger |

---

## 10. Status & error codes
- 200 OK, 201 Created, 204 No Content.
- 401 unauthenticated, 403 forbidden (wrong role/permission/ownership),
  404 not found, 422 validation (`{message, errors}`), 429 rate-limited, 500 server.

## 11. Pagination meta (every list)
```json
"meta": { "current_page":1, "last_page":5, "per_page":20, "total":92 }
```

> Keep TS types (`storefront/src/lib/types.ts`, `admin/src/api/types.ts`) and Laravel API
> Resources in lockstep with this document. This file wins any disagreement.
