# DigitalOcean Deployment Guide - Step by Step

This guide will walk you through deploying the World Health Portal to DigitalOcean App Platform.

## Prerequisites Checklist

- [ ] GitHub account with repository access
- [ ] DigitalOcean account ([Sign up here](https://www.digitalocean.com/))
- [ ] Code pushed to GitHub repository: `shayer2009/healthcare-rn-platform`

---

## Step 1: Prepare GitHub Repository

### 1.1 Check if code is on GitHub

The app spec (`.do/app.yaml`) is configured for repository: `shayer2009/healthcare-rn-platform`

**If your code is NOT on GitHub yet:**

1. Create a new repository on GitHub named `healthcare-rn-platform`
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ready for deployment"
   git remote add origin https://github.com/shayer2009/healthcare-rn-platform.git
   git branch -M main
   git push -u origin main
   ```

**If your GitHub username is different from `shayer2009`:**

1. Update `.do/app.yaml` - replace `shayer2009` with your GitHub username in both places:
   - Line 18: `repo: YOUR_USERNAME/healthcare-rn-platform`
   - Line 49: `repo: YOUR_USERNAME/healthcare-rn-platform`
2. Commit and push the change

---

## Step 2: Create Database on DigitalOcean

### 2.1 Create Managed Database

1. Go to [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
2. Navigate to **Databases** → **Create Database Cluster**
3. Choose:
   - **Database Engine:** MySQL (compatible with MariaDB)
   - **Version:** MySQL 8 (or latest)
   - **Region:** Same as your app (e.g., **New York 1**)
   - **Plan:** Start with **Basic** → **Basic-1GB** ($15/month) or **Basic-2GB** ($30/month)
4. Click **Create Database Cluster**
5. Wait for cluster to be created (2-3 minutes)

### 2.2 Get Database Connection Details

1. Open your database cluster
2. Go to **Connection Details** tab
3. Note down:
   - **Host** (e.g., `db-mysql-nyc1-12345-do-user-123456-0.b.db.ondigitalocean.com`)
   - **Port** (usually `25060` for managed databases)
   - **Database** (default: `defaultdb`)
   - **Username** (default: `doadmin`)
   - **Password** (click **Show** to reveal - save this securely!)

### 2.3 Configure Database Access

1. In database cluster, go to **Settings** → **Trusted Sources**
2. Add your app's IP or allow all sources temporarily (you can restrict later)

---

## Step 3: Deploy Application

### Option A: Using DigitalOcean Dashboard (Recommended)

#### 3.1 Create App

1. Go to [Apps](https://cloud.digitalocean.com/apps) → **Create App**
2. Choose **GitHub** and authorize DigitalOcean if needed
3. Select repository: **shayer2009/healthcare-rn-platform**
4. Select branch: **main**
5. Click **Next**

#### 3.2 Configure Backend Service

1. DigitalOcean should detect the backend service
2. Verify settings:
   - **Resource Type:** Service
   - **Name:** `backend`
   - **Source Directory:** `backend` ✅
   - **Build Command:** `npm ci`
   - **Run Command:** `node src/server.js`
   - **HTTP Port:** `8080`
   - **Instance Size:** `Basic-XXS` (512MB RAM) or `Basic-XS` (1GB RAM)
3. Click **Edit** on the backend service

#### 3.3 Add Environment Variables

Click **Edit** → **Environment Variables** and add:

| Key | Value | Type | Notes |
|-----|-------|------|-------|
| `PORT` | `8080` | General | HTTP port |
| `NODE_ENV` | `production` | General | Environment |
| `DB_HOST` | `your-db-host` | Secret | From Step 2.2 |
| `DB_PORT` | `25060` | General | From Step 2.2 |
| `DB_USER` | `doadmin` | Secret | From Step 2.2 |
| `DB_PASSWORD` | `your-db-password` | Secret | From Step 2.2 |
| `DB_NAME` | `defaultdb` | General | From Step 2.2 |
| `JWT_SECRET` | `generate-random-string` | Secret | See below |

**Generate JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

#### 3.4 Configure Admin Panel (Optional)

1. Click **Add Component** → **Static Site**
2. Configure:
   - **Name:** `admin-panel`
   - **Source Directory:** `admin-panel`
   - **Build Command:** `npm ci && npm run build`
   - **Output Directory:** `dist`
3. Add environment variable:
   - **Key:** `VITE_API_URL`
   - **Value:** Will be auto-filled with backend URL after first deploy
   - **Type:** General

#### 3.5 Review and Deploy

1. Review all settings
2. Click **Create Resources**
3. Wait for deployment (5-10 minutes)
4. Note your app URLs:
   - Backend: `https://backend-xxxxx.ondigitalocean.app`
   - Admin Panel: `https://admin-panel-xxxxx.ondigitalocean.app`

---

### Option B: Using doctl CLI

#### 3.1 Install doctl

```bash
# Windows (PowerShell)
choco install doctl

# Mac
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-windows-amd64.zip
# Extract and add to PATH
```

#### 3.2 Authenticate

```bash
doctl auth init
# Enter your DigitalOcean API token
```

#### 3.3 Create App from Spec

```bash
cd healthcare-rn-platform
doctl apps create --spec .do/app.yaml
```

#### 3.4 Add Environment Variables

After app is created, go to [App Platform UI](https://cloud.digitalocean.com/apps):
1. Open your app
2. Go to **Settings** → **App-Level Environment Variables**
3. Add all variables from Step 3.3 above
4. Click **Save**
5. Go to **Deployments** → **Create Deployment** to trigger redeploy with new env vars

---

## Step 4: Run Database Migrations

After the app is deployed and running:

### Option A: Using App Console

1. Go to your app in DigitalOcean dashboard
2. Click **Console** tab
3. Select **backend** service
4. Run:
   ```bash
   node src/migrations/migrate.js
   ```

### Option B: Using One-Off Job

1. In App Platform, go to **Components** → **Add Component**
2. Choose **Job**
3. Configure:
   - **Name:** `run-migrations`
   - **Source Directory:** `backend`
   - **Run Command:** `node src/migrations/migrate.js`
4. Run the job

### Option C: Add Pre-Deploy Hook (Recommended)

Update `.do/app.yaml` to add migrations before deploy:

```yaml
services:
  - name: backend
    # ... existing config ...
    run_command: node src/server.js
    pre_deploy_command: node src/migrations/migrate.js  # Add this line
```

Then redeploy.

---

## Step 5: Verify Deployment

### 5.1 Check Backend Health

```bash
curl https://your-backend-url.ondigitalocean.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.45,
  "environment": "production"
}
```

### 5.2 Test Database Connection

```bash
curl https://your-backend-url.ondigitalocean.app/ready
```

Should return:
```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "..."
}
```

### 5.3 Access Admin Panel

1. Open: `https://your-admin-panel-url.ondigitalocean.app`
2. Login with:
   - **Email:** `admin@healthapp.local`
   - **Password:** `admin123`

### 5.4 Test API Endpoints

```bash
# Login
curl -X POST https://your-backend-url.ondigitalocean.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@healthapp.local","password":"admin123"}'

# Should return token and user info
```

---

## Step 6: Post-Deployment Configuration

### 6.1 Update Admin Panel API URL

If admin panel was deployed separately:
1. Go to admin panel component settings
2. Update `VITE_API_URL` environment variable to your backend URL
3. Redeploy admin panel

### 6.2 Configure Optional Services

Add environment variables for optional features:

| Feature | Env Var | Description |
|---------|---------|-------------|
| Video Calls | `DAILY_API_KEY` | Get from [Daily.co](https://dashboard.daily.co/) |
| Email Reminders | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP server details |
| SMS Reminders | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Get from [Twilio](https://www.twilio.com/) |
| Redis Cache | `REDIS_URL` | Redis connection string |
| Error Tracking | `SENTRY_DSN` | Get from [Sentry](https://sentry.io/) |

### 6.3 Change Default Passwords

**IMPORTANT:** Change default passwords in production!

1. Connect to database via phpMyAdmin or MySQL client
2. Update admin password:
   ```sql
   UPDATE admins SET password_hash = '$2a$10$NEW_HASH_HERE' WHERE email = 'admin@healthapp.local';
   ```
3. Use bcrypt to generate new hash (or create new admin via API)

---

## Troubleshooting

### App Won't Start

1. Check **Runtime Logs** in App Platform dashboard
2. Common issues:
   - Database connection failed → Check DB credentials
   - Port mismatch → Ensure PORT=8080
   - Missing env vars → Verify all required variables are set

### Database Connection Errors

1. Verify database is running
2. Check **Trusted Sources** in database settings
3. Verify connection details (host, port, user, password)
4. Test connection from app console:
   ```bash
   node -e "const mariadb = require('mariadb'); mariadb.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME}).then(c => {console.log('Connected!'); c.end();})"
   ```

### Admin Panel Shows API Errors

1. Check browser console for errors
2. Verify `VITE_API_URL` is set correctly
3. Check CORS settings (should allow admin panel domain)
4. Verify backend is accessible from admin panel URL

### Migrations Fail

1. Check database user has CREATE TABLE permissions
2. Verify database exists
3. Check migration logs in app console
4. Run migrations manually via console

---

## Cost Estimation

- **Basic Backend Service (Basic-XXS):** ~$5/month
- **Managed Database (Basic-1GB):** ~$15/month
- **Admin Panel (Static Site):** Free
- **Total:** ~$20/month

For production, consider:
- **Backend:** Basic-XS (1GB) - $12/month
- **Database:** Basic-2GB - $30/month
- **Total:** ~$42/month

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Configure SSL certificates (automatic with App Platform)
3. ✅ Set up monitoring and alerts
4. ✅ Configure backups for database
5. ✅ Review security settings
6. ✅ Update default credentials
7. ✅ Configure CI/CD for auto-deployments

---

## Support

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Managed Databases Docs](https://docs.digitalocean.com/products/databases/)
- [Project README](./README.md)
