# Deployment & CI/CD — Shared LiteSpeed server (SSH + rsync)

> **This is the live, verified setup.** All three apps run on a shared **LiteSpeed** server
> (the same box that hosts Magic Management / hotel-management "Server 2" and several other
> projects). Deploys are **rsync over SSH** from your machine — the server is not a git repo
> and there is no cPanel/FTP or GitHub Actions FTP in the live path. Frontends are built
> locally (Node isn't needed on the server) and their static `dist/` is rsynced up; the
> Laravel backend is rsynced dir-by-dir and `artisan` runs over SSH.
>
> The server facts, rsync rules, and post-deploy sequence below were learned the hard way —
> the "Mistakes & gotchas" section (§9) is required reading before your first deploy. The
> sibling doc `/Users/himanshuragi/Desktop/Code/personal/hotel-management/DEPLOYMENT.md` is
> the original source of those lessons for the same server.

---

## 0. Server at a glance (verified 2026-07-09)

```
SSH   : ssh -i ~/.ssh/id_rsa -p 22 magicman1@45.199.139.15
Env   : Ubuntu · LiteSpeed (NOT Apache) · PHP 8.2.31 · MariaDB · composer + rsync in /usr/bin
Base  : /var/www/7cdb3aaf-9f78-4a90-bba7-14c7d98d26f8/
```

Shared **website container**: you do NOT own the box, there is **no crontab and no queue
worker** (`crontab` reports "Command unavailable in website container"). Use
`QUEUE_CONNECTION=sync`; the storefront-rebuild trigger fires inline (see §6).

---

## 1. Domain / hosting layout

Three vhost folders under the base path above (one repo, three deploy targets):

| App | Build output | Server folder (under base) | URL |
|-----|--------------|-----------------------------|-----|
| Backend (Laravel) | full PHP app (rsync) | `shreeapi.magicmanagement.in/` | `https://shreeapi.magicmanagement.in` |
| Admin (React/Vite) | `admin/dist/` (static) | `shreeadmin.magicmanagement.in/` | `https://shreeadmin.magicmanagement.in` |
| Storefront (Astro) | `storefront/dist/` (static) | `shreekrishna.magicmanagement.in/` | `https://shreekrishna.magicmanagement.in` |

API base URL: `https://shreeapi.magicmanagement.in/api`.

**Docroot cannot be repointed to a `public/` subfolder** on this host — the vhost folder
itself is the docroot. So the full Laravel app lives at the vhost root, and a **root
`.htaccess`** rewrites everything into `public/` (Laravel's own `public/.htaccess` front
controller stays untouched):

```apache
# shreeapi.magicmanagement.in/.htaccess  (already in place on the server)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/public/
    RewriteRule ^(.*)$ public/$1 [L,QSA]
</IfModule>
```

The two static apps hold their build output directly in the vhost root and each ship an
`.htaccess` (HTTPS + caching; admin also needs SPA fallback to `index.html`).

---

## 2. Deploy shell variables

Everything below assumes these are set in your shell (paste at the top of a deploy session):

```bash
SSH="ssh -i ~/.ssh/id_rsa -p 22"
SRV=magicman1@45.199.139.15
BASE=/var/www/7cdb3aaf-9f78-4a90-bba7-14c7d98d26f8
API=$BASE/shreeapi.magicmanagement.in
ADMIN=$BASE/shreeadmin.magicmanagement.in
STORE=$BASE/shreekrishna.magicmanagement.in

# Build-time env for the frontends (injected inline so your local .env is untouched)
APIURL=https://shreeapi.magicmanagement.in/api
```

> **rsync source paths must be ABSOLUTE.** The shell cwd resets between steps/tool calls, so
> a relative `storefront/dist/` can silently point at the wrong place. Use the full repo path.

---

## 3. Storefront (Astro static)

Built locally, rsynced to the vhost root. `--delete` is **safe here** because the whole
folder is just static build output (it is NOT a Laravel `public/` — see §9 #1).

```bash
cd storefront
# API URL + site URL baked in at build time; the build fetches the catalog from the live API.
PUBLIC_API_URL=$APIURL \
PUBLIC_SITE_URL=https://shreekrishna.magicmanagement.in \
PUBLIC_RAZORPAY_KEY_ID=rzp_test_T69awRoBGSkEbO \
  npm run build

# .htaccess (HTTPS + caching) must already be in dist/ before rsync — keep it in storefront/public/.htaccess
rsync -avz --delete -e "$SSH" "$(pwd)/dist/" $SRV:$STORE/
```

> The storefront build hits the live API many times. This host **rate-limits / fail2bans
> bursts** (see §9 #4) — if a build 429s or the IP gets firewalled, wait and re-run.

---

## 4. Admin (React/Vite SPA)

```bash
cd admin
VITE_API_URL=$APIURL VITE_APP_NAME="SKC Admin" npm run build
# admin/public/.htaccess must include SPA fallback (rewrite unknown paths → index.html) + HTTPS
rsync -avz --delete -e "$SSH" "$(pwd)/dist/" $SRV:$ADMIN/
```

SPA-fallback `.htaccess` (lives in `admin/public/.htaccess`, copied into `dist/` by Vite):
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

## 5. Backend (Laravel) — SSH + rsync

The server is **not** a git repo. Deploy = rsync **one directory at a time** (never multiple
sources in one command — they dump flat into the root, §9 #2), then run `artisan` over SSH.
`vendor/` is NOT shipped — the server runs its own `composer install` (platform-matched).
**Never** rsync `.env`, `storage/`, or `bootstrap/cache/` (§9 #3, #5).

```bash
REPO=/Users/himanshuragi/Desktop/Code/personal/e-commerce-shree-krishna/backend

# 1. Sync code, one dir → matching target. bootstrap synced WITHOUT its cache/ subdir.
rsync -avz -e "$SSH" "$REPO/app/"       $SRV:$API/app/
rsync -avz -e "$SSH" "$REPO/bootstrap/" $SRV:$API/bootstrap/ --exclude=cache/
rsync -avz -e "$SSH" "$REPO/config/"    $SRV:$API/config/
rsync -avz -e "$SSH" "$REPO/database/"  $SRV:$API/database/
rsync -avz -e "$SSH" "$REPO/resources/" $SRV:$API/resources/
rsync -avz -e "$SSH" "$REPO/routes/"    $SRV:$API/routes/
# composer.json/lock only when deps changed:
rsync -avz -e "$SSH" "$REPO/composer.json" "$REPO/composer.lock" $SRV:$API/

# 2. If composer.lock changed, refresh vendor ON THE SERVER (never rsync vendor/):
$SSH $SRV "cd $API && composer install --no-dev --optimize-autoloader --no-interaction"

# 3. Delete stale bootstrap cache, migrate, clear caches, rediscover packages.
#    (Local bootstrap/cache references dev pkgs like laravel/pail that aren't on the server.)
$SSH $SRV "cd $API && rm -f bootstrap/cache/services.php bootstrap/cache/packages.php \
  && php artisan migrate --force \
  && php artisan config:clear && php artisan route:clear && php artisan cache:clear \
  && php artisan package:discover --ansi"

# 4. Ensure the storage symlink exists (see §9 #6 for the real-dir gotcha).
$SSH $SRV "cd $API && php artisan storage:link 2>&1 || true"
```

> **`bootstrap/app.php`** registers middleware aliases — it lives in `bootstrap/` and IS
> synced by step 1 (we only exclude `bootstrap/cache/`). Forgetting it → 500 on every route
> with "Target class [...] does not exist" (§9 hotel-management lesson #3).

### Backend server setup (one-time — already done, for reference)
1. MySQL DB `magicman1_shreekrishna` (name = user), host `localhost`, created in mPanel.
   Password has shell-special chars → in `.env` it MUST be double-quoted: `DB_PASSWORD="..."`.
2. `.env` created from `.env.example`; `php artisan key:generate`; `APP_ENV=production`,
   `APP_DEBUG=false`, real/test Razorpay keys, CORS origins, storefront-rebuild vars (§6).
3. Vhost root holds the full Laravel app + the root `.htaccess` rewrite into `public/` (§1).
4. `php artisan migrate` (do NOT run `--seed` in prod — `ProductSeeder` uses `faker` which is
   `require-dev` and absent under `--no-dev`; it would crash. Real products come from admin).
5. `php artisan storage:link`; `storage/` + `bootstrap/cache/` writable (775).

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

## 8. Deploy order (routine redeploys — all three apps already live)

1. **Backend first** (§5) — rsync code, `composer install` if deps changed, `migrate --force`,
   clear caches. Verify `https://shreeapi.magicmanagement.in/api/products` returns JSON.
2. **Storefront** (§3) — the build fetches the catalog from the live API, so the backend must
   be up and correct first. Verify the site loads and product pages render.
3. **Admin** (§4) — verify login + CRUD.
4. First-time only: Razorpay keys + webhook `https://shreeapi.magicmanagement.in/api/webhooks/razorpay`.

---

## 9. Mistakes & gotchas (this exact server — read before deploying)

Learned the hard way on this LiteSpeed box (and its sibling in hotel-management's DEPLOYMENT.md).

1. **Never `rsync --delete` into a Laravel `public/`.** It wipes `index.php`, `.htaccess`, and
   the `storage` symlink → instant 404/500. `--delete` is only safe on the *static* storefront
   and admin vhost roots, which are pure build output.
2. **rsync one dir at a time, source→matching target.** Multiple sources in one command
   (`rsync a/ b/ c/ $SRV:$API/`) dump every file flat into the project root.
3. **Never sync `bootstrap/cache/`.** Local cache references dev-only packages (`laravel/pail`);
   the server doesn't have them → every `php artisan` dies with "Class ... not found". Delete
   the stale cache files on the server and let `package:discover` regenerate them.
4. **Host rate-limits / firewalls connection bursts** (fail2ban-style) and the app rate-limits
   public routes (120/min/IP → HTTP 429). A storefront build fires many concurrent API calls;
   if it 429s or your IP gets curl→000 / SSH-timeout, wait a few minutes and retry. Don't hammer.
5. **`.env` and `storage/` live on the server — never overwrite them.** After any `.env` edit,
   run `php artisan config:clear` on the server or the change won't take effect.
6. **`storage:link` after deploy.** LiteSpeed *does* follow the symlink once it's made correctly.
   If `public/storage` is a real directory (not a symlink), uploads become invisible — `rm -rf`
   it and re-run `php artisan storage:link`. Verify with `ls -la public/storage` (want `lrwxrwxrwx`).
7. **WAF blocks `settings`/`public`-ish public paths → HTTP 444/blocked.** `/api/settings/public`
   was blocked; the route is now `/api/site-config`. Avoid those words in new public routes.
8. **No cron, no queue worker** in this container. `QUEUE_CONNECTION=sync`; the storefront-rebuild
   trigger runs inline (§6). Don't rely on `schedule:run`/queue daemons.
9. **Don't `migrate --seed` in prod.** `ProductSeeder` uses `faker` (require-dev, absent under
   `--no-dev`) → crash. Real products come from the admin panel.
10. **Back up the DB before migrations that drop/alter columns.** `mysqldump magicman1_shreekrishna
    > backup.sql` on the server first; a dropped column is not recoverable from code.

---

## 10. Redeploy checklist
- [ ] Back up DB if the deploy includes destructive migrations (§9 #10).
- [ ] Backend: rsync dirs (§5 step 1), `composer install` if `composer.lock` changed, run the
      artisan block (migrate + clear caches + package:discover), `storage:link`.
- [ ] Verify `…/api/products` returns JSON before building frontends.
- [ ] Storefront + admin: build with `PUBLIC_API_URL`/`VITE_API_URL` = the live API, rsync `dist/`.
- [ ] Smoke-test: storefront loads with data, admin login + a product edit, checkout (COD + online).
- [ ] `APP_DEBUG=false`; watch `storage/logs/laravel.log` for the first few minutes.
