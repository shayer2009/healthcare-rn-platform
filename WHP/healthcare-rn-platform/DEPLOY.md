# Deploy World Health Portal to DigitalOcean App Platform

## Prerequisites

1. **GitHub account** – code must be in a GitHub repo.
2. **DigitalOcean account** – [Sign up](https://www.digitalocean.com/).
3. **MariaDB/MySQL database** – use DigitalOcean Managed Database or your own.

---

## Step 1: Push code to GitHub

If the project is not on GitHub yet:

```bash
cd healthcare-rn-platform
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/healthcare-rn-platform.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Update the App Spec

1. Open `.do/app.yaml`.
2. Replace **every** `YOUR_GITHUB_USERNAME` with your real GitHub username (e.g. `johndoe` so the repo is `johndoe/healthcare-rn-platform`).
3. Save the file and commit:

   ```bash
   git add .do/app.yaml
   git commit -m "Set GitHub repo for deploy"
   git push
   ```

---

## Step 3: Create a database (if you don’t have one)

**Option A – DigitalOcean Managed Database (recommended)**

1. In [DigitalOcean Control Panel](https://cloud.digitalocean.com/) go to **Databases** → **Create Database Cluster**.
2. Choose **MySQL** (compatible with MariaDB).
3. Pick a region (e.g. **New York 1**) and a plan.
4. Create the cluster, then open it and note:
   - **Host**
   - **Port** (usually `25060`)
   - **Database**
   - **Username**
   - **Password**

**Option B – Use your own MariaDB/MySQL server**

Use your existing host, port, database name, user, and password in the env vars below.

---

## Step 4: Deploy the app

**Option A – DigitalOcean dashboard**

1. Go to [Apps](https://cloud.digitalocean.com/apps) → **Create App**.
2. Choose **GitHub** and authorize DigitalOcean if needed.
3. Select the repo **healthcare-rn-platform** and branch **main**.
4. DigitalOcean will detect the app. Configure:
   - **Resource type:** Service.
   - **Name:** `backend`.
   - **Source directory:** `backend`.
   - **Run command:** `node src/server.js`.
   - **HTTP port:** `8080`.
5. Add **Environment variables** (use **Encrypt** for secrets):

   | Key        | Value                    |
   |-----------|---------------------------|
   | `PORT`    | `8080`                    |
   | `NODE_ENV`| `production`              |
   | `DB_HOST` | your DB host              |
   | `DB_PORT` | your DB port (e.g. `25060`) |
   | `DB_USER` | your DB user              |
   | `DB_PASSWORD` | your DB password (secret) |
   | `DB_NAME` | your DB name              |
   | `JWT_SECRET` | long random string (secret) |

6. Create the app and wait for the first deploy.

**Option B – doctl (if you use the spec)**

1. [Install doctl](https://docs.digitalocean.com/reference/doctl/how-to/install/) and run `doctl auth init` with your DO token.
2. After editing `.do/app.yaml` (Step 2) and creating a DB (Step 3), create the app:

   ```bash
   doctl apps create --spec .do/app.yaml
   ```

3. In the [App Platform UI](https://cloud.digitalocean.com/apps), open your app → **Settings** → **App-Level Environment Variables** and add the same variables as in the table above (including DB and `JWT_SECRET`).
4. Trigger a new deployment so the app starts with the correct env.

---

## Step 5: Run migrations (first time)

After the app is running:

1. In the app’s **Console** tab (or via a one-off job), run:

   ```bash
   cd backend && node src/migrations/migrate.js
   ```

   Or add a **Pre-Deploy Job** in the app spec that runs this command so migrations run before each deploy.

---

## Default seed logins (change in production)

- **Admin:** admin@healthapp.local / admin123  
- **Doctor:** doctor@healthapp.local / doctor123  
- **Assistant:** assistant@healthapp.local / assistant123  

Change these and use strong secrets in production.

---

## Optional: Admin panel (static site)

To deploy the React admin panel as a static site on App Platform:

1. In the same app, add a **Static Site** component.
2. **Source:** same GitHub repo and branch.
3. **Source directory:** `admin-panel`.
4. **Build command:** `npm ci && npm run build`.
5. **Output directory:** `dist`.
6. Set **Environment variable** `VITE_API_URL` to your backend URL (e.g. `https://your-backend.ondigitalocean.app`) so the UI calls the right API.

You can also uncomment and fill the `static_sites` section in `.do/app.yaml` and deploy with `doctl apps create --spec .do/app.yaml`.

---

## Troubleshooting

- **"Git branch not found"** – Ensure:
  1. The repo exists on GitHub and has at least one commit.
  2. The branch in `.do/app.yaml` matches your default branch (`main` or `master`). If your repo uses `master`, change `branch: main` to `branch: master` in `.do/app.yaml`.
  3. Your DigitalOcean account has GitHub connected (Settings → API → GitHub) and has access to the repo (for private repos, grant access to the org/user).
- After fixing, create the app again via dashboard or `doctl apps create --spec .do/app.yaml`.

---

## Need help?

- The spec in `.do/app.yaml` is set to repo **shayer2009/healthcare-rn-platform**. Ensure that repo is pushed, the branch exists, and DO can access it.
- Docs: [App Platform](https://docs.digitalocean.com/products/app-platform/), [Managed Databases](https://docs.digitalocean.com/products/databases/).
