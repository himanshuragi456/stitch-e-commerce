# How to make a change — end-to-end workflow

> This is the practical loop for shipping a fix or feature on this project: find the
> code, change it, prove it works locally, ship it to the live server, verify it live,
> then commit + push. For server facts, exact rsync commands, and gotchas, see
> **`60-DEPLOYMENT.md`** — this doc is the workflow; that one is the reference.

---

## 0. What "deploy" means here

When asked to "deploy" / "sync" / "make it live", that means **both**:
1. Get the change onto the live server (SSH/rsync).
2. Commit + push to GitHub.

Order: **server first, then git push.** Frontends (storefront, admin) also auto-rebuild
via GitHub Actions on push to `main` — the manual rsync below gets the fix live
*immediately* without waiting ~1–2 min for CI, and the push keeps the repo and the
server in sync either way.

`git push` alone is **not** a deploy for the backend — Laravel is not auto-deployed;
it always needs a manual rsync (§60-DEPLOYMENT.md §5).

---

## 1. Find the problem

Don't guess from the file tree — trace the actual code path:
- Frontend bug (wrong page, 404, broken flow): find the route/page file, then the
  component/island it renders, then trace how it fetches data (which API call, which
  id/param, from where).
- Backend bug: find the controller/route, then the model/query it touches.
- If the repo is large or the flow crosses several files, use a research agent
  (`Explore` / fork) to map it out before touching anything — cheaper than guessing.

Confirm the actual root cause before editing. In this codebase specifically, the
storefront is a **fully static Astro build** (`output: 'static'` in
`storefront/astro.config.mjs`) — dynamic-looking routes like `/order/[id]/...` do
**not** get a file per id at build time unless `getStaticPaths()` says so, and there is
**no SPA fallback** for the storefront (only `shreeadmin` has one). A route with
`getStaticPaths() { return [] }` builds *zero* HTML files and 404s in production even
though the dev server serves it fine. Check this first for any "page 404s in prod but
works in dev" report.

---

## 2. Make the change

- Prefer editing existing files; keep the diff scoped to the actual bug.
- If a route needs to work for arbitrary dynamic ids under static output, the pattern
  used in this repo (see `storefront/src/pages/order/[id]/confirmation.astro`) is:
  1. `getStaticPaths()` returns **one placeholder** path (e.g. `{ params: { id: '_' } }`)
     so a single shell HTML file gets built.
  2. `storefront/public/.htaccess` rewrites the real dynamic path to that shell
     (`RewriteRule ^order/[^/]+/confirmation/?$ /order/_/confirmation/index.html [L]`).
  3. The React island reads the *real* id back out of `window.location` client-side
     (`Astro.params` is empty for any id except the placeholder at build time).
- Don't add speculative error handling, config flags, or abstractions beyond what the
  bug requires.

---

## 3. Prove it locally before shipping

- **Type-check:** `cd storefront && npx astro check` (or the equivalent for
  `admin`/`backend`) — must be 0 errors. Pre-existing warnings unrelated to your change
  are fine to leave.
- **Build:** run the real production build locally and read the output — for the
  storefront, confirm the expected page actually appears in the `generating static
  routes` list:
  ```bash
  cd storefront
  PUBLIC_API_URL=https://shreeapi.magicmanagement.in/api \
  PUBLIC_SITE_URL=https://shreekrishna.magicmanagement.in \
  PUBLIC_RAZORPAY_KEY_ID=rzp_test_T69awRoBGSkEbO \
    npm run build
  ```
- A clean build/typecheck is necessary but **not sufficient** — it doesn't prove the
  feature actually works (see §5).

---

## 4. Ship it to the live server

Follow `60-DEPLOYMENT.md` §2–§5 for the exact commands per app (storefront / admin /
backend). Summary:

```bash
SSH="ssh -i ~/.ssh/id_rsa -p 22"
SRV=magicman1@45.199.139.15
BASE=/var/www/7cdb3aaf-9f78-4a90-bba7-14c7d98d26f8

# Storefront (static, --delete is safe — pure build output, not a Laravel public/)
rsync -avz --delete -e "$SSH" "<abs-path-to-repo>/storefront/dist/" $SRV:$BASE/shreekrishna.magicmanagement.in/

# Admin (static, same pattern)
rsync -avz --delete -e "$SSH" "<abs-path-to-repo>/admin/dist/" $SRV:$BASE/shreeadmin.magicmanagement.in/

# Backend (Laravel) — ONE directory at a time, NEVER --delete into public/, NEVER sync bootstrap/cache/
# See 60-DEPLOYMENT.md §5 for the full sequence (composer install, migrate, cache clear, storage:link).
```

Rules that have bitten this project before (full detail in `60-DEPLOYMENT.md` §9):
- rsync source paths must be **absolute** — shell cwd resets between steps.
- Never `rsync --delete` into a Laravel `public/` (wipes `index.php`/`.htaccess`/symlink).
- Never sync `bootstrap/cache/` (dev-only package refs break `artisan` on the server).
- The host rate-limits/firewalls connection bursts — space out requests if a build 429s.

---

## 5. Verify on the real live URL — don't declare success from a build

After deploying, actually hit production and confirm the fix:

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://shreekrishna.magicmanagement.in/<path-that-was-broken>"
curl -s "https://shreekrishna.magicmanagement.in/<path>" | grep -o "<text-that-should-be-there>"
```

For anything interactive (checkout, login, admin CRUD), drive the actual flow — curl
the API calls it makes, or open it in a browser — not just "the page returns 200."
A 200 with the wrong content, or a 200 that's actually the site's catch-all/error page,
both look fine from `curl -o /dev/null -w "%{http_code}"` alone; check the body too.

---

## 6. Commit and push

```bash
git add <changed files>   # never `git add -A` — review status first for stray dist/, .env, secrets
git commit -m "fix(scope): what and why, not a changelog of every line"
git push origin main
```

- Never commit `.env`, `dist/`, `vendor/`, `node_modules/`.
- If the storefront/admin auto-rebuild pipeline exists (`StorefrontRebuildService`,
  `.github/workflows/deploy-*.yml`), the push above will trigger a redundant rebuild of
  what you already manually deployed in §4 — that's expected and harmless, not a bug.

---

## 7. Destructive or production-data actions — confirm first

Before anything hard to reverse — schema-altering migrations, `.env` edits on the
server, deleting live catalog data, force-pushing — stop and confirm scope with the
user first, and back up:

```bash
# DB backup before a risky migration
ssh -i ~/.ssh/id_rsa -p 22 magicman1@45.199.139.15 \
  "mysqldump magicman1_shreekrishna > backup-$(date +%Y%m%d-%H%M).sql"

# .env backup before editing on the server
ssh -i ~/.ssh/id_rsa -p 22 magicman1@45.199.139.15 \
  "cp $BASE/shreeapi.magicmanagement.in/.env $BASE/shreeapi.magicmanagement.in/.env.bak.$(date +%Y%m%d-%H%M)"
```

Never delete "unknown" test data on the live catalog silently — flag it and ask.

---

## Quick reference

| Need | Where |
|---|---|
| Server host, SSH key, vhost paths | `60-DEPLOYMENT.md` §0–§2 |
| Exact per-app build + rsync commands | `60-DEPLOYMENT.md` §3–§5 |
| Auto-rebuild pipeline (catalog edit → storefront rebuild) | `60-DEPLOYMENT.md` §6 |
| Known gotchas (rate limits, symlinks, WAF-blocked paths, etc.) | `60-DEPLOYMENT.md` §9 |
| Full redeploy checklist | `60-DEPLOYMENT.md` §10 |
