# Deployment Failure Troubleshooting

Common reasons DigitalOcean deployment fails and how to fix them.

---

## 1. Build fails: "npm ci" / "package-lock.json not found"

**Symptom:** Build log shows error like `npm ERR! \`npm ci\` can only install packages when your package.json and package-lock.json are in sync` or missing lock file.

**Cause:** DigitalOcean's Node buildpack runs `npm ci` by default, which requires a `package-lock.json`. Without it, the install step fails before your build command runs.

**Fix applied:**
- **USE_NPM_INSTALL:** In `.do/app.yaml`, both backend and admin-panel have env var `USE_NPM_INSTALL` with `scope: BUILD_TIME` and value `"true"`. This makes the buildpack use `npm install` instead of `npm ci`, so no lock file is required.
- **Backend build script:** Backend `package.json` has `"build": "echo No build step"` so the default `npm run build` step does not fail.
- **Build commands:** Both components use `build_command: npm run build` (backend runs the no-op script; admin runs Vite build).

**Optional:** To use `npm ci` (faster, reproducible), run `npm install` in `backend/` and `admin-panel/` locally, commit the generated `package-lock.json` files, and you can remove `USE_NPM_INSTALL` later.

---

## 2. Backend build fails: module not found / ESM errors

**Symptom:** Build or runtime errors about "Cannot find module" or "ERR_REQUIRE_ESM".

**Cause:** Backend uses ES modules (`"type": "module"`). Node must be 18+.

**Fix:** 
- In App Platform, set **Node.js version** to 18 or 20 for the backend component (Settings → Environment).
- Backend `package.json` includes `"engines": { "node": ">=18.0.0" }`; use a Node version that satisfies this.

---

## 3. Backend starts then crashes (runtime / health check fails)

**Symptom:** Build succeeds but deployment is "Unhealthy" or logs show "Failed to start backend" / "process exited".

**Cause:** Backend needs DB env vars. If they’re missing or wrong, `bootstrapDatabase()` fails and the process exits.

**Fix:**
1. In DigitalOcean: your App → **Settings** → **App-Level Environment Variables** (or the backend component’s env vars).
2. Add and save:
   - `DB_HOST` (Managed DB host)
   - `DB_PORT` (e.g. `25060`)
   - `DB_USER`
   - `DB_PASSWORD` (mark as **Secret**)
   - `DB_NAME`
   - `JWT_SECRET` (long random string, mark as **Secret**)
3. Under the database cluster → **Settings** → **Trusted Sources**, allow **App Platform** (or the right sources).
4. Trigger a new deployment so the backend restarts with the new env.

---

## 4. Admin panel build fails: VITE_API_URL or env

**Symptom:** Admin panel build fails or builds but calls wrong API (e.g. localhost).

**Cause:** Admin panel uses `VITE_API_URL` at build time. If it was set to something like `${backend.PUBLIC_URL}` and that wasn’t available during build, the build or URL can be wrong.

**Fix applied:** 
- Admin code uses `import.meta.env.VITE_API_URL || "http://localhost:4000"`.
- In `.do/app.yaml`, admin has `VITE_API_URL` with an empty default so the build always succeeds.

**After first deploy:**
1. Copy your backend URL (e.g. `https://backend-xxxx.ondigitalocean.app`).
2. Edit the **admin-panel** component → **Environment Variables**.
3. Set `VITE_API_URL` = that backend URL.
4. Save and **Redeploy** the admin-panel so the new URL is baked into the build.

---

## 5. Admin panel 404 or blank page

**Symptom:** Admin URL loads but shows 404 or a blank page.

**Cause:** Static site routing: all routes must serve `index.html`. App Platform usually handles this for static sites; if not, it may be a path or output dir issue.

**Fix:** 
- Ensure **Output Directory** for the admin component is `dist`.
- Ensure **Build Command** is `npm install && npm run build` and that the build actually produces `dist/` with `index.html`.

---

## 6. Database connection refused / timeout

**Symptom:** Logs show "connect ECONNREFUSED" or "Connection timeout" to DB.

**Fix:**
1. Confirm the database cluster is **Running**.
2. **Trusted Sources:** Database → Settings → Trusted Sources → add **App Platform** or "All IPv4" for testing.
3. Use the exact **Host** and **Port** from the database **Connection details** (port is often `25060`, not 3306).
4. Confirm **DB_USER**, **DB_PASSWORD**, **DB_NAME** match the database (e.g. default user `doadmin` and default db `defaultdb`).

---

## 7. Health check fails (backend Unhealthy)

**Symptom:** Backend is "Unhealthy"; `/health` or `/ready` fails.

**Fix:**
1. Confirm the app listens on **PORT** (default in spec: `8080`). Backend uses `process.env.PORT || 4000`; on App Platform, **PORT** must be set to `8080`.
2. In the backend component, **HTTP Port** should be `8080`.
3. **Health Check** in spec uses `http_path: /health`. In the dashboard, ensure the health check path is `/health` and the port matches.
4. If the app crashes before listening (e.g. DB bootstrap fails), fix DB env vars and redeploy (see #3).

---

## 8. "Git branch not found" / repo access

**Symptom:** App creation or deploy fails with branch or repo not found.

**Fix:**
1. Ensure the GitHub repo exists and the branch (e.g. `main`) exists and has at least one commit.
2. In DigitalOcean: **Settings** → **API** → **GitHub** → ensure the correct account/org is connected and has access to the repo.
3. In `.do/app.yaml`, `branch: main` must match your default branch name (use `master` if that’s your default).
4. If the repo is under a different user/org, update `repo: username/healthcare-rn-platform` in `.do/app.yaml` and in any dashboard config.

---

## Quick checklist

- [ ] Build uses `npm install` (not `npm ci`) unless you have committed `package-lock.json`.
- [ ] Backend has all DB env vars and `JWT_SECRET` set; DB trusted sources include App Platform.
- [ ] Backend **HTTP Port** = `8080` and env **PORT** = `8080`.
- [ ] Node version for backend is 18+.
- [ ] After first deploy, set admin **VITE_API_URL** to backend URL and redeploy admin.
- [ ] Repo and branch in spec and dashboard match your GitHub repo and default branch.

If you have the exact error message or log line from the failed deploy, use it to match the symptom above for a precise fix.
