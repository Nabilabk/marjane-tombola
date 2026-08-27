# Deploying to Azure — step by step

The repo is ready to deploy: `.github/workflows/` has the two pipelines
(frontend + backend), and `marjane_final/public/staticwebapp.config.json`
handles client-side routing — it lives in `public/` specifically so Vite
copies it into `dist/` on every build (a file at the project root, outside
`public/`, is never included in the build output). What's left is creating
the actual Azure resources and connecting them — that part needs your
Azure/GitHub accounts, so it can't be scripted from here.

## 0. Push this repo to GitHub

```bash
git add -A
git commit -m "Initial commit"
```

Then create an empty repo on github.com (no README/license, so it stays
empty), and:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

## 1. Database — Azure Database for MySQL Flexible Server

1. Azure Portal → "Create a resource" → "Azure Database for MySQL flexible server"
2. Compute tier: **Burstable, B1ms** (cheapest that works for testing)
3. Set an admin username/password, note them down
4. Under "Networking", allow "Public access" and tick **"Allow public access
   from any Azure service"** (App Service needs to reach it)
5. Once created, go to "Databases" on the resource and create a database
   named `tombola` (matches `MYSQL_DATABASE` in your `.env`)

## 2. Backend — Azure App Service

1. "Create a resource" → "Web App"
2. Runtime stack: **Python 3.12**, OS: **Linux**, region: same as your DB
3. Pricing plan: **F1 (Free)** to start, or **B1** if you want it always-on
   (F1 sleeps after inactivity — fine for testing, not for a real demo link
   you're sending people)
4. After creation, go to **Configuration → General settings → Startup
   Command** and set:
   ```
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
5. Go to **Configuration → Application settings** and add every variable
   from `backend/.env`, pointing `MYSQL_HOST` etc. at the server from step 1:
   `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`,
   `MYSQL_PASSWORD`, `OCR_API_KEY`, `ADMIN_JWT_SECRET`, `SUPER_ADMIN_EMAIL`,
   `SUPER_ADMIN_PASSWORD`, `CORS_ALLOWED_ORIGINS`, plus one new one:
   `APP_ENV` = `production`
   - `CORS_ALLOWED_ORIGINS` **must** be set to your real frontend origin(s)
     (e.g. `https://<random-name>.azurestaticapps.net`, comma-separated if
     there's more than one) once you have it from step 3 below. Without it
     the backend only accepts requests from `localhost`, so the deployed
     frontend can't reach the API until this is set.
   - `APP_ENV=production` makes the backend **refuse to boot** if
     `ADMIN_JWT_SECRET` or `SUPER_ADMIN_PASSWORD` are still their insecure
     fallback values (`dev-only-insecure-secret-change-me` / `admin123`) —
     set real values for both before setting this, or the App Service will
     just crash-loop. This is deliberate: those two fallbacks are readable
     by anyone on GitHub, so this app must never run with them for real.
6. Go to **Deployment Center → Manage publish profile → Download**. Open
   that file, copy its entire contents.
7. On GitHub: repo **Settings → Secrets and variables → Actions**:
   - New **secret** `AZURE_WEBAPP_PUBLISH_PROFILE` = paste the file contents
   - New **variable** `AZURE_WEBAPP_NAME` = the app's name (from the Azure
     Portal, e.g. `marjane-tombola-api`)
8. Push to `main` (or re-run the workflow) — the backend deploys. Your API
   base is `https://<app-name>.azurewebsites.net`.

## 3. Frontend — Azure Static Web Apps

1. "Create a resource" → "Static Web App"
2. Deployment source: **GitHub** — sign in, pick this repo, branch `main`
3. Build details: app location `marjane_final`, output location `dist`,
   leave "Api location" blank
4. Azure creates its own workflow file when you do it this way — **delete
   the one it generates** and keep `.github/workflows/azure-static-web-app.yml`
   from this repo instead (same job, but it also injects `VITE_API_BASE` at
   build time, which Azure's default template doesn't do)
5. Copy the **deployment token**: resource → "Manage deployment token"
6. On GitHub: **Settings → Secrets and variables → Actions**:
   - New **secret** `AZURE_STATIC_WEB_APPS_API_TOKEN` = the token
   - New **variable** `VITE_API_BASE` = `https://<app-name>.azurewebsites.net`
     (the backend URL from step 2.8 — **must** be set before the next build,
     since Vite bakes it in at build time, not runtime)
7. Push to `main` — the frontend deploys. You get a URL like
   `https://<random-name>.azurestaticapps.net`.

## 4. Verify it's real

Open the Static Web Apps URL on your phone (not the same wifi as your PC,
if you can — a different network is the real test). Log in, click around.
If something's broken, check:

- **Backend logs**: App Service resource → "Log stream"
- **Is the backend even up?**: hit `https://<app-name>.azurewebsites.net/health`
  directly — it answers `{"status": "ok"}` without touching the DB, so it's
  the fastest way to tell "process is dead" apart from "DB is unreachable"
  (also worth pointing an Azure Application Insights / uptime check at it)
- **CORS/network errors**: browser dev tools → Network tab, on the deployed
  site — a failed request there means `VITE_API_BASE` or the backend's CORS
  isn't set right
- **Blank page on refresh of a deep link** (e.g. `/admin/site/xyz/theme`):
  means `staticwebapp.config.json` didn't get picked up — check it actually
  landed inside `marjane_final/dist` after the build

## Notes

- CORS is locked to `CORS_ALLOWED_ORIGINS` (defaults to the local Vite dev
  server only) — set it to your real frontend URL(s) in App Service's
  Application settings (see step 2.5) before sending anyone the deployed
  link, or every request from the deployed frontend will be rejected.
- The public, unauthenticated endpoints (`/api/participate`,
  `/api/receipt/validate`, `/api/dice/roll`, `/api/play`,
  `/api/clients/verify`) and `/api/auth/login` are rate-limited per IP
  (`slowapi`, in-memory) to blunt scripted abuse — see the comments above
  `limiter = Limiter(...)` in `app.py` for the numbers and reasoning. It's
  per-process, so if this ever moves to more than one App Service instance,
  swap the in-memory store for a shared one (e.g. Redis).
- Every admin mutation (account create/edit/delete, prize odds/tiers,
  product rules, campaign lifecycle, campaign create/edit/delete, plus
  login) is recorded to `admin_audit_log` in the master DB — who, what, and
  when. Read it via `GET /api/admin/audit-log` (super_admin only); there's
  no admin UI page for it yet, just the API.
- The App Service **F1 free tier sleeps** after ~20 minutes idle — the first
  request after that takes a few extra seconds to wake up. Normal, not a bug.
