# Quick Deployment Summary

## What I've Prepared

✅ **Updated `.do/app.yaml`** - Configured for monorepo structure:
- Backend service with `source_dir: backend`
- Admin panel static site enabled
- Health checks configured
- Environment variables template ready

✅ **Created Deployment Guide** - `DEPLOYMENT-GUIDE.md` with step-by-step instructions

✅ **Created Checklist** - `DEPLOY-CHECKLIST.md` for tracking deployment progress

---

## Quick Start (3 Steps)

### 1. Push to GitHub (if not already done)

```bash
# If git is not initialized:
git init
git add .
git commit -m "Ready for DigitalOcean deployment"
git remote add origin https://github.com/shayer2009/healthcare-rn-platform.git
git branch -M main
git push -u origin main
```

**Note:** If your GitHub username is NOT `shayer2009`, update `.do/app.yaml`:
- Line 14: Change `repo: shayer2009/healthcare-rn-platform` to your username
- Line 45: Change `repo: shayer2009/healthcare-rn-platform` to your username

### 2. Create Database on DigitalOcean

1. Go to [DigitalOcean Databases](https://cloud.digitalocean.com/databases)
2. Click **Create Database Cluster**
3. Choose:
   - **MySQL** (compatible with MariaDB)
   - **Region:** New York 1 (or same as your app)
   - **Plan:** Basic-1GB ($15/month) or Basic-2GB ($30/month)
4. Click **Create**
5. Wait 2-3 minutes, then copy connection details:
   - Host, Port (usually 25060), Database, Username, Password

### 3. Deploy App

**Option A: Using Dashboard (Easiest)**

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **Create App** → **GitHub**
3. Select repo: `shayer2009/healthcare-rn-platform` → Branch: `main`
4. DigitalOcean will auto-detect backend service
5. **Configure Backend:**
   - Verify Source Directory: `backend`
   - Verify Build Command: `npm ci`
   - Verify Run Command: `node src/server.js`
   - Verify Port: `8080`
6. **Add Environment Variables** (click Edit on backend):
   ```
   PORT=8080
   NODE_ENV=production
   DB_HOST=<from database>
   DB_PORT=25060
   DB_USER=<from database>
   DB_PASSWORD=<from database> (mark as SECRET)
   DB_NAME=<from database>
   JWT_SECRET=<generate random 32 char string> (mark as SECRET)
   ```
7. **Add Admin Panel** (optional):
   - Click "Add Component" → "Static Site"
   - Source Directory: `admin-panel`
   - Build Command: `npm ci && npm run build`
   - Output Directory: `dist`
   - Add env var: `VITE_API_URL` = backend URL (set after first deploy)
8. Click **Create Resources**
9. Wait 5-10 minutes for deployment

**Option B: Using doctl CLI**

```bash
# Install doctl (if not installed)
# Windows: choco install doctl
# Mac: brew install doctl

# Authenticate
doctl auth init

# Create app from spec
doctl apps create --spec .do/app.yaml

# Then add environment variables via dashboard
```

---

## After Deployment

### 1. Run Database Setup

The app will automatically create tables on first run (via `bootstrapDatabase()` in `server.js`). No manual migrations needed!

### 2. Verify Deployment

```bash
# Test health endpoint
curl https://your-backend-url.ondigitalocean.app/health

# Test database connection
curl https://your-backend-url.ondigitalocean.app/ready
```

### 3. Access Admin Panel

- URL: `https://your-admin-panel-url.ondigitalocean.app`
- Login: `admin@healthapp.local` / `admin123`

### 4. Test API

```bash
# Login test
curl -X POST https://your-backend-url.ondigitalocean.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@healthapp.local","password":"admin123"}'
```

---

## Important Notes

⚠️ **Default Passwords:** Change these in production!
- Admin: `admin@healthapp.local` / `admin123`
- Doctor: `doctor@healthapp.local` / `doctor123`
- Assistant: `assistant@healthapp.local` / `assistant123`

⚠️ **Database:** Make sure to:
- Allow App Platform IPs in database trusted sources
- Use strong passwords
- Keep connection details secure

⚠️ **Environment Variables:** All database and JWT secrets should be marked as **SECRET** type in App Platform

---

## Cost Estimate

- **Backend Service (Basic-XXS):** ~$5/month
- **Database (Basic-1GB):** ~$15/month
- **Admin Panel:** Free (static site)
- **Total:** ~$20/month

---

## Troubleshooting

**App won't start?**
- Check Runtime Logs in App Platform dashboard
- Verify all environment variables are set
- Check database connection details

**Database connection failed?**
- Verify database is running
- Check trusted sources in database settings
- Verify connection details (host, port, user, password)

**Admin panel API errors?**
- Verify `VITE_API_URL` is set to backend URL
- Check CORS settings
- Verify backend is accessible

---

## Next Steps

1. ✅ Deploy app
2. ✅ Verify health checks
3. ✅ Change default passwords
4. ✅ Configure optional services (Daily.co, SMTP, Twilio)
5. ✅ Set up monitoring
6. ✅ Review security settings

---

## Full Documentation

- **Detailed Guide:** See `DEPLOYMENT-GUIDE.md`
- **Checklist:** See `DEPLOY-CHECKLIST.md`
- **Project README:** See `README.md`

---

## Support

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Managed Databases Docs](https://docs.digitalocean.com/products/databases/)
