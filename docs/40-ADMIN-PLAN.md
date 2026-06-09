# Admin Panel Plan — React SPA (Vite)

> Login-gated staff tool (admin + employee). No SEO. Runtime API calls only. Read
> `00-OVERVIEW.md`, `10-DESIGN-SYSTEM.md`, and `50-API-CONTRACT.md` first.

---

## 1. Stack & why

- **Vite + React 18 + TypeScript (strict)**. Builds to static files → served from
  `admin.shreekrishnacollection.com` (or `/admin` subfolder) on cPanel. No Node runtime.
- **Routing:** React Router v6.
- **Server state:** **TanStack Query** (caching, mutations, invalidation) — the right tool
  for a CRUD admin. **Client/UI state:** Zustand (auth, ui) — small and simple.
- **Forms:** React Hook Form + **Zod** (schema validation, shared with TS types).
- **Styling:** Tailwind + shared design tokens (`10-DESIGN-SYSTEM.md`). Same look as
  storefront but denser (admin tables/forms).
- **Tables:** TanStack Table (sorting, pagination, filters).
- **Icons:** `lucide-react` + custom SVGs. **No emojis.**
- **HTTP:** a typed `apiClient` (fetch wrapper) that injects the bearer token and handles
  401 → logout/redirect.
- **Charts (dashboard):** Recharts (lightweight, composable).
- ESLint + Prettier + TypeScript strict.

### Install
```bash
npm create vite@latest admin -- --template react-ts
cd admin
npm i react-router-dom @tanstack/react-query @tanstack/react-table zustand \
  react-hook-form zod @hookform/resolvers lucide-react recharts axios
npm i -D tailwindcss postcss autoprefixer @tailwindcss/forms eslint prettier
npx tailwindcss init -p
```

---

## 2. Folder structure

```
admin/src/
├── api/
│   ├── client.ts          # axios/fetch instance + token + 401 handling
│   ├── auth.ts  products.ts  categories.ts  orders.ts  customers.ts
│   ├── staff.ts  coupons.ts  settings.ts  suggestions.ts  labels.ts  dashboard.ts
│   └── types.ts           # TS types mirroring API (shared contract)
├── app/
│   ├── router.tsx         # routes + guards
│   ├── providers.tsx      # QueryClient, Router, Toaster
│   └── guards.tsx         # <RequireAuth>, <RequirePermission permission="...">
├── components/
│   ├── ui/                # Button, Input, Select, Modal, Drawer, Badge, Card,
│   │                      # Table, Pagination, Toast, Spinner, ConfirmDialog,
│   │                      # FileUpload, ImageGalleryManager, RichTextEditor
│   ├── layout/            # AppShell (sidebar + topbar), Sidebar, Topbar, PageHeader
│   └── domain/            # ProductForm, LengthEditor, SuggestionPicker,
│                          # OrderStatusBadge, OrderItemsTable, AddressBlock, etc.
├── features/              # one folder per screen area (pages + hooks)
│   ├── auth/              # LoginPage
│   ├── dashboard/
│   ├── products/          # ProductsListPage, ProductCreatePage, ProductEditPage
│   ├── categories/
│   ├── orders/            # OrdersListPage, OrderDetailPage (+ label printing)
│   ├── customers/
│   ├── staff/             # admin-only
│   ├── coupons/
│   └── settings/
├── hooks/                 # useAuth, usePermission, useDebounce, useToast
├── lib/                   # format.ts (money/date), constants, zod schemas
├── store/                 # auth.store.ts, ui.store.ts (zustand)
├── styles/                # tokens.css + index.css (Tailwind)
└── main.tsx
```

---

## 3. Auth & roles

- **Login** (`/login`): email + password → `POST /api/admin/auth/login` → store token +
  staff profile (incl. role + permissions) in `auth.store` (persisted to localStorage).
- `apiClient` attaches `Authorization: Bearer`. On 401 → clear auth, redirect to login.
- **Route guards:**
  - `<RequireAuth>` wraps the whole app shell.
  - `<RequirePermission permission="manage-products">` wraps admin-only routes.
- **Role behavior:**
  - **Admin:** sees everything, full CRUD, staff management, settings, all permissions.
  - **Employee:** restricted nav — sees **Orders** and can **print/download shipping
    stickers** only. No product/category/staff/settings/customer-management access. Hide
    nav items they lack permission for AND guard the routes (don't rely on hiding alone).
- `usePermission('x')` hook drives both nav visibility and in-page action gating.

---

## 4. App shell / layout

- Left **sidebar** (collapsible; off-canvas drawer on mobile) with nav grouped:
  - Dashboard
  - Catalog: Products, Categories
  - Sales: Orders, Coupons
  - People: Customers, Staff (admin only)
  - Settings (admin only)
- **Topbar:** page title/breadcrumbs, search (global order/product lookup), user menu
  (profile, logout), environment badge in non-prod.
- Content area with `PageHeader` (title + primary action button) + page body.
- Consistent loading (skeletons), empty, and error states for every list/detail.
- Toaster for success/error feedback on every mutation.
- Fully responsive: tables become horizontally scrollable with a sticky first column;
  forms stack; sidebar collapses to a drawer.

---

## 5. Screen specs

### 5.1 Dashboard
- KPI cards: today's sales, orders count, pending orders, low-stock count.
- Sales chart (last 30 days, Recharts line/bar).
- Recent orders table (last 10) with quick status + link.
- Low-stock list (products whose `stock_metres` is below a threshold).
- Employees see a simplified dashboard or are routed straight to Orders.

### 5.2 Products — list
- TanStack Table: image thumb, name, category, intended_use badge, price/metre,
  stock_metres, # offered lengths, status (active/inactive), featured flag.
- Search, filter (category, intended_use, status), sort, pagination (server-side via API).
- Row actions: Edit, Toggle active, Delete (ConfirmDialog), Duplicate.
- "Add product" primary button.

### 5.3 Products — create/edit (`ProductForm`) — the most complex screen
Tabbed or sectioned form (React Hook Form + Zod):
1. **Basics:** name (auto-suggest slug, editable), category (select), intended_use
   (select), material, color + color_hex (color picker), pattern, base SKU, description
   (RichTextEditor), is_active, is_featured.
2. **Pricing & stock:** **one** `price_per_metre` (₹ input via MoneyInput → paise),
   optional `compare_at_per_metre` (for showing a discount), and `stock_metres` (total
   metres in stock — a single number). A small live preview shows the computed per-piece
   price for each offered length (e.g. "1.50 m → ₹600"). **Price is strictly per_metre ×
   length — there are no per-length prices.**
3. **Offered lengths (`LengthEditor`):** the fixed list of selectable lengths for this
   cloth — repeatable rows of just `length_metres` (e.g. 1.25, 1.30, 1.50), add/remove/
   reorder. Saved via `PUT /admin/products/{id}/lengths`. At least one length required.
   No price/stock here (those live on the product).
4. **Images (`ImageGalleryManager`):** drag-drop multi-upload → `POST product images`;
   reorder (drag), set primary (the swatch), edit alt, delete. Show that >1 image becomes
   a slider on storefront. Validate type/size; show upload progress.
5. **Pairing suggestions (`SuggestionPicker`):** search/pick other products to recommend.
   **Pre-filter the picker to complementary intended_use** (call the API which uses
   `SuggestionService::complementaryUses`, or filter client-side): e.g. when editing a
   *shirt*, default to showing *pant/suit* products. Admin can override the filter. Saved
   list is ordered (drag to reorder). This powers the storefront "Pairs well with".
6. **SEO (optional):** meta_title, meta_description overrides.

On save: validate, submit, toast, invalidate product queries. **Saving any product/
category change triggers the storefront rebuild** server-side (admin doesn't do anything
special — backend handles it; optionally show a small "Storefront updating…" hint).

### 5.4 Categories
- List (name, slug, parent, # products, position, active), reorder (position), CRUD.
- Form: name/slug, parent (select), description, image, active, SEO overrides.

### 5.5 Orders — list
- Table: order_number, date, customer, total, payment status, fulfillment status,
  # items. Filters: status, payment status, date range. Search by number/email/phone.
  Server-side pagination/sort.
- **Bulk select → "Print shipping labels" (batch PDF)** — available to employees.
- Row click → order detail.

### 5.6 Orders — detail
- Header: order_number, date, status badge, payment badge.
- Customer + shipping/billing address blocks.
- Order items table (name, length, sku, unit price, qty, line total) + totals
  (subtotal, shipping, discount, total).
- **Actions:**
  - Update fulfillment status (guarded transitions per backend).
  - **Print / download shipping sticker** (single) → opens/downloads PDF from
    `GET /api/admin/orders/{id}/label`. **Employee-accessible.**
  - Payment info (gateway ids), refund (admin only) if applicable.
  - Internal notes (staff).
- Status timeline display.

> Employees' Orders access = view + update status (if permitted) + print labels. The
> printing flow is the core employee workflow: open order(s) → print sticker → ship.

### 5.7 Customers (admin)
- List (name, email, phone, # orders, total spent, joined). Search. Detail: profile,
  addresses, order history. Read-mostly; optional deactivate.

### 5.8 Staff (admin only)
- List staff (name, email, role, active, last login). Create/edit staff, set role
  (admin/employee), activate/deactivate, reset password. Cannot delete self / last admin.

### 5.9 Coupons
- CRUD: code, type (percent/fixed), value, min order, usage limit, validity dates, active.

### 5.10 Settings (admin only)
- Store info (name, contact, address — used on shipping labels), shipping flat rate +
  free-ship threshold, social links, payment keys (write-only display), policies text.
- "Trigger storefront rebuild now" manual button (calls a backend admin endpoint) —
  useful safety valve.

---

## 6. Shared components to build first (in `components/ui`)
Button, Input, Select, Textarea, Checkbox, Switch, Modal, Drawer, ConfirmDialog, Badge,
Card, Table (wrapper over TanStack Table), Pagination, Toast/Toaster, Spinner/Skeleton,
FileUpload, ImageGalleryManager, RichTextEditor (TipTap or similar, output sanitized
HTML/markdown), MoneyInput (₹ ↔ paise), Tabs, PageHeader, EmptyState.

All follow `10-DESIGN-SYSTEM.md`. Build these before feature screens.

---

## 7. Data layer conventions
- One `api/<resource>.ts` per resource, returning typed data. One TanStack Query
  hook set per resource (`useProducts`, `useProduct`, `useCreateProduct`, ...).
- Mutations invalidate the relevant query keys; show toasts; handle 422 field errors by
  mapping them back onto the form (React Hook Form `setError`).
- Money: API gives `_paise`; convert at the edge with `lib/format.ts`. Inputs use
  `MoneyInput` (rupees in UI, paise to API).
- Never expose secrets; payment keys shown masked.

---

## 8. Env (`.env` / `.env.example`)
```
VITE_API_URL=https://api.shreekrishnacollection.com/api
VITE_APP_NAME=SKC Admin
```

---

## 9. What an implementer produces, in order
1. Vite/React/TS + Tailwind + tokens + ESLint/Prettier; providers/router/guards.
2. `api/client.ts` + types; auth store; LoginPage; RequireAuth/RequirePermission.
3. AppShell (sidebar/topbar) + UI component library (`components/ui`).
4. Products list + ProductForm (price/metre + stock, offered lengths, images, suggestions)
   — the big one.
5. Categories CRUD.
6. Orders list + detail + **label printing (single + batch)**.
7. Customers, Staff (admin-only), Coupons, Settings.
8. Dashboard + charts.
9. Responsive + a11y pass; empty/loading/error states everywhere.

> Employee role must be correctly restricted (orders + labels only). Match
> `50-API-CONTRACT.md` exactly. No emojis — SVG icons only.
