# Shree Krishna Collection — E-commerce

E-commerce platform for **Shree Krishna Collection**, a seller of unstitched cloth
material (fabric sold by length — e.g. 1.25m / 1.30m / 1.50m pieces customers buy and get
stitched). Shopify-grade, clean and modern, SEO-first.

## Three apps (monorepo)

| App | Folder | Tech | Purpose |
|-----|--------|------|---------|
| Storefront | `storefront/` | Astro (static) | Public, SEO-critical shopping site |
| Admin Panel | `admin/` | React + Vite | Staff (admin + employee) management |
| Backend API | `backend/` | Laravel 11 + MySQL | Source of truth, serves both apps |

## Start here — planning docs

**Resuming work? Read [`docs/PROGRESS.md`](docs/PROGRESS.md) first** — it records what's
built, what's next, and how to run things.

Read in order. **`docs/00-OVERVIEW.md` is the shared contract; read it first.**

1. [`docs/00-OVERVIEW.md`](docs/00-OVERVIEW.md) — master plan, domain, conventions, brand
2. [`docs/10-DESIGN-SYSTEM.md`](docs/10-DESIGN-SYSTEM.md) — tokens, components, logo/SVGs
3. [`docs/20-BACKEND-PLAN.md`](docs/20-BACKEND-PLAN.md) — schema, API, services, payments
4. [`docs/30-STOREFRONT-PLAN.md`](docs/30-STOREFRONT-PLAN.md) — pages, SEO, data fetching
5. [`docs/40-ADMIN-PLAN.md`](docs/40-ADMIN-PLAN.md) — screens, roles, features
6. [`docs/50-API-CONTRACT.md`](docs/50-API-CONTRACT.md) — canonical endpoint reference
7. [`docs/60-DEPLOYMENT.md`](docs/60-DEPLOYMENT.md) — cPanel + GitHub Actions CI/CD
8. [`docs/70-BUILD-ORDER.md`](docs/70-BUILD-ORDER.md) — step-by-step task breakdown

## Key facts

- **Domain:** a Product is a length of cloth for an intended garment (shirt/pant/…), sold
  priced per metre, sold in a fixed set of selectable lengths from one metre-based stock
  pool, with admin-curated **pairing suggestions** (shirt cloth → pant cloth).
- **SEO:** storefront is static HTML built from the API; catalog edits in admin trigger an
  automatic GitHub Actions rebuild + redeploy (~1–2 min).
- **Hosting:** MilesWeb cPanel. No Node runtime on the host — all builds run in CI.
- **Money:** integer paise everywhere in the API. **No emojis** in any UI — SVG icons only.

## Build sequence (high level)

Backend → freeze API contract → design system → storefront → admin → payments/labels/
suggestions → deploy. Full task list in `docs/70-BUILD-ORDER.md`.
