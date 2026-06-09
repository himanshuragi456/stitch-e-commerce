# Deployment & CI/CD — MilesWeb cPanel + GitHub Actions

> How all three apps reach production on **MilesWeb cPanel shared hosting**, and how
> catalog edits auto-rebuild the static storefront. cPanel has no native build service, so
> **all builds run on GitHub Actions** and the **artifacts are deployed to cPanel** over
> FTP (and the Laravel backend over FTP/SSH). Read `00-OVERVIEW.md` §5 first.

---

## 1. Domain / hosting layout

Three deploy targets on the same cPanel account (one repo, three pipelines):

| App | Build output | Deploy target on cPanel | URL |
|-----|--------------|--------------------------|-----|
| Storefront (Astro) | `storefront/dist/` (static) | `public_html/` (main domain docroot) | `https://www.shreekrishnacollection.com` |
| Admin (React/Vite) | `admin/dist/` (static) | subdomain docroot e.g. `admin.shreekrishnacollection.com` → `public_html/admin` or a dedicated subdomain folder | `https://admin.shreekrishnacollection.com` |
| Backend (Laravel) | full PHP app | a subdomain e.g. `api.shreekrishnacollection.com`; **docroot must point to Laravel's `public/`** | `https://api.shreekrishnacollection.com` |

In cPanel:
1. Create subdomains `admin` and `api`.
2. For **api**, set the subdomain's **Document Root to `.../api/public`** (Laravel serves
   from `public/`, never expose the app root). If cPanel won't let docroot be a subfolder,
   place the Laravel app outside webroot and put a thin `index.php`+`.htaccess` in the
   subdomain docroot pointing to it.
3. SPAs need SPA-fallback routing: add an `.htaccess` in admin & storefront docroots that
   rewrites unknown paths to `index.html` (storefront only needs it for client island
   pages like `/account/*`, `/checkout`; static pages serve directly).

---

## 2. Secrets (GitHub repo → Settings → Secrets and variables → Actions)

Create these repository secrets:

```
# cPanel FTP (one account or per-target — MilesWeb gives FTP creds in cPanel)
CPANEL_FTP_HOST            e.g. ftp.shreekrishnacollection.com
CPANEL_FTP_USER
CPANEL_FTP_PASSWORD

# Per-target remote dirs (relative to FTP user home; confirm exact paths in cPanel)
STOREFRONT_REMOTE_DIR      e.g. /public_html/
ADMIN_REMOTE_DIR           e.g. /admin.shreekrishnacollection.com/   (or /public_html/admin/)
BACKEND_REMOTE_DIR         e.g. /api.shreekrishnacollection.com/

# Build-time env injected into the frontends
PUBLIC_API_URL            https://api.shreekrishnacollection.com/api
PUBLIC_SITE_URL           https://www.shreekrishnacollection.com
PUBLIC_RAZORPAY_KEY_ID    rzp_live_xxx   (public key id only)
VITE_API_URL              https://api.shreekrishnacollection.com/api

# For the backend → GitHub rebuild trigger (see §6)
# (this PAT lives in the BACKEND .env on the server, NOT in Actions — see §6)
```

> If MilesWeb provides **SSH**, prefer it (rsync is faster + atomic) for the backend; FTP
> is the universal fallback. Examples below use FTP via `SamKirkland/FTP-Deploy-Action`.

---

## 3. Pipeline 1 — Storefront (the auto-rebuild one)

File: `.github/workflows/deploy-storefront.yml`

**Triggers:**
- `push` to `main` touching `storefront/**` or shared docs,
- `workflow_dispatch` (manual),
- **`repository_dispatch` with type `rebuild-storefront`** ← fired by the backend when the
  catalog changes (this is the on-save rebuild).

```yaml
name: Deploy Storefront
on:
  push:
    branches: [main]
    paths: ["storefront/**"]
  workflow_dispatch:
  repository_dispatch:
    types: [rebuild-storefront]

concurrency:                     # collapse rapid rebuilds into the latest
  group: storefront-deploy
  cancel-in-progress: true

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: storefront } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: storefront/package-lock.json }
      - run: npm ci
      - name: Build (fetches catalog from API at build time)
        env:
          PUBLIC_API_URL: ${{ secrets.PUBLIC_API_URL }}
          PUBLIC_SITE_URL: ${{ secrets.PUBLIC_SITE_URL }}
          PUBLIC_RAZORPAY_KEY_ID: ${{ secrets.PUBLIC_RAZORPAY_KEY_ID }}
        run: npm run build
      - name: Deploy to cPanel via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.CPANEL_FTP_HOST }}
          username: ${{ secrets.CPANEL_FTP_USER }}
          password: ${{ secrets.CPANEL_FTP_PASSWORD }}
          local-dir: storefront/dist/
          server-dir: ${{ secrets.STOREFRONT_REMOTE_DIR }}
          # FTP-Deploy syncs only changed files (keeps a state file remotely)
```

> `concurrency.cancel-in-progress` + the backend-side debounce (§6) means a burst of admin
> edits results in a single fresh build, not a queue of stale ones.

---

## 4. Pipeline 2 — Admin

File: `.github/workflows/deploy-admin.yml` — same shape, no `repository_dispatch`
(admin doesn't need auto-rebuild; deploy on push to `admin/**` or manual).

```yaml
name: Deploy Admin
on:
  push: { branches: [main], paths: ["admin/**"] }
  workflow_dispatch:
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: admin } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: admin/package-lock.json }
      - run: npm ci
      - run: npm run build
        env: { VITE_API_URL: ${{ secrets.VITE_API_URL }} }
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.CPANEL_FTP_HOST }}
          username: ${{ secrets.CPANEL_FTP_USER }}
          password: ${{ secrets.CPANEL_FTP_PASSWORD }}
          local-dir: admin/dist/
          server-dir: ${{ secrets.ADMIN_REMOTE_DIR }}
```

Ship an `.htaccess` (in `admin/public/.htaccess`, copied into dist) for SPA fallback:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 5. Pipeline 3 — Backend (Laravel)

File: `.github/workflows/deploy-backend.yml`

Builds vendor deps + runs tests, then deploys code. **Migrations and cache steps run on
the server** (cPanel) — either via SSH (preferred) or a one-time/manual `php artisan`
through cPanel's "Terminal"/cron. Two options:

**Option A — SSH (preferred if MilesWeb gives SSH):**
```yaml
name: Deploy Backend
on:
  push: { branches: [main], paths: ["backend/**"] }
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: "8.3" }
      - run: composer install --no-dev --optimize-autoloader --no-interaction
      - run: cp .env.example .env   # real .env lives on server; tests use this
      # (optional) run tests against sqlite/mysql service before deploy
      - name: Upload via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.CPANEL_FTP_HOST }}
          username: ${{ secrets.CPANEL_FTP_USER }}
          password: ${{ secrets.CPANEL_FTP_PASSWORD }}
          local-dir: backend/
          server-dir: ${{ secrets.BACKEND_REMOTE_DIR }}
          exclude: |   # never overwrite server secrets/storage
            **/.env
            **/storage/**
            **/.git*/**
            **/tests/**
            **/node_modules/**
      - name: Post-deploy artisan (via SSH)
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ${{ secrets.BACKEND_SSH_PATH }}
            php artisan migrate --force
            php artisan storage:link || true
            php artisan config:cache && php artisan route:cache && php artisan view:cache
            php artisan queue:restart
```

**Option B — FTP only (no SSH):** deploy files via FTP, then run
`php artisan migrate --force` + cache commands manually via cPanel **Terminal**, or set a
cPanel **cron job** that runs them. Document the exact commands in the repo
(`backend/DEPLOY_NOTES.md`). The first deploy always needs a manual `.env` + `key:generate`
+ `migrate --seed` on the server.

### Backend server setup (one-time, in cPanel)
1. Create MySQL DB + user (cPanel → MySQL Databases); put creds in server `.env`.
2. Upload code; create `.env` from `.env.example`; `php artisan key:generate`.
3. Point `api` subdomain docroot to `backend/public`.
4. `php artisan migrate --seed`; `php artisan storage:link`; set `storage/` + `bootstrap/
   cache/` writable (755/775).
5. Set `APP_ENV=production`, `APP_DEBUG=false`, real Razorpay keys, CORS origins, and the
   GitHub rebuild PAT (see §6) in `.env`.
6. If using queues for the debounced rebuild, set up a cron running
   `php artisan schedule:run` every minute (cPanel cron), or use `QUEUE_CONNECTION=sync`
   for simplicity in v1.

---

## 6. The auto-rebuild trigger (catalog edit → storefront rebuild)

When the admin creates/updates/deletes a product or category (or relevant settings), the
backend tells GitHub to run the storefront pipeline.

### 6.1 Backend side — `StorefrontRebuildService`
- Reads from `.env`:
  ```
  GITHUB_REPO=owner/repo                 # e.g. yourname/skc-ecommerce
  GITHUB_DISPATCH_TOKEN=ghp_xxx          # fine-grained PAT, scope: Actions: read/write on this repo only
  STOREFRONT_REBUILD_ENABLED=true
  STOREFRONT_REBUILD_DEBOUNCE_SECONDS=90
  ```
- `trigger(string $reason)`:
  - If disabled, return. Otherwise acquire a **cache lock / debounce**: store
    `rebuild_pending=true` and only POST to GitHub if no rebuild fired in the last
    `DEBOUNCE_SECONDS`. Implement with `Cache::lock` + a queued/delayed job so a burst of
    edits coalesces into one dispatch.
  - POST to GitHub:
    ```
    POST https://api.github.com/repos/{GITHUB_REPO}/dispatches
    Headers: Authorization: Bearer {token}
             Accept: application/vnd.github+json
             X-GitHub-Api-Version: 2022-11-28
    Body: { "event_type": "rebuild-storefront",
            "client_payload": { "reason": "<reason>", "at": "<iso>" } }
    ```
  - This matches the storefront workflow's `repository_dispatch: types: [rebuild-storefront]`.
- Call `trigger()` from product/category/length/image/suggestion create-update-delete and
  from the manual `POST /admin/rebuild-storefront` endpoint.

### 6.2 Why debounce + concurrency
- Backend debounce: 10 quick edits → 1 (or few) dispatches.
- Workflow `concurrency: cancel-in-progress` → if a new build starts, the in-flight stale
  one is cancelled. Net effect: the storefront reflects the latest catalog ~1–2 min after
  the last edit, with minimal wasted builds.

### 6.3 PAT scope (security)
Use a **fine-grained PAT** limited to **this repository**, permission **Actions:
Read and write** only. Store it ONLY in the server `.env` (never in the repo, never in
client code, never in the admin app). Rotate if leaked.

---

## 7. HTTPS, headers, caching

- Enable **AutoSSL / Let's Encrypt** in cPanel for all three hostnames.
- `.htaccess` (storefront) — long cache for hashed assets, short/no-cache for HTML:
  ```apache
  <IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 0 seconds"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
  </IfModule>
  # Force HTTPS
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  ```
  (Astro fingerprints asset filenames, so 1-year caching of CSS/JS is safe; HTML stays
  fresh so new builds show immediately.)
- Backend: set CORS to allow only storefront + admin origins; enable gzip/brotli.

---

## 8. Environments & first-deploy order

1. **Backend first** — provision DB, deploy, `.env`, `migrate --seed`, verify
   `https://api.../api/products` returns JSON. Without this, frontends can't build.
2. **Storefront** — set Actions secrets, run the workflow, verify static site loads and
   product pages render with data + correct SEO tags.
3. **Admin** — deploy, log in as seeded admin, verify CRUD + that saving a product fires a
   storefront rebuild (watch the Actions tab).
4. Configure Razorpay live keys + webhook URL (`/api/webhooks/razorpay`) in the Razorpay
   dashboard.

---

## 9. Rollback & safety
- FTP-Deploy keeps changed-file sync; to roll back, re-run a previous commit's workflow
  (`workflow_dispatch` on an older ref) — rebuilds from that code.
- Never let a failed build deploy: each workflow deploys only if build steps succeed.
- Back up the MySQL DB (cPanel → Backup) before running new migrations on production.
- Keep `APP_DEBUG=false` in production. Monitor `storage/logs/laravel.log`.

---

## 10. Checklist for the implementer
- [ ] Create `api` + `admin` subdomains; point `api` docroot to `backend/public`.
- [ ] Add all GitHub Actions secrets (§2).
- [ ] Commit the three workflow files (§3–§5) + `.htaccess` files.
- [ ] One-time backend server setup (§5) incl. `.env`, key, migrate, storage:link, SSL.
- [ ] Put `GITHUB_REPO` + fine-grained `GITHUB_DISPATCH_TOKEN` in backend `.env`; verify
      editing a product triggers the `rebuild-storefront` workflow.
- [ ] Verify HTTPS on all three hostnames; CORS correct; Razorpay webhook configured.
