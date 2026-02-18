# DigitalOcean Deployment Checklist

Use this checklist to ensure a smooth deployment.

## Pre-Deployment

- [ ] Code is pushed to GitHub repository: `shayer2009/healthcare-rn-platform`
- [ ] GitHub username matches in `.do/app.yaml` (if different, update it)
- [ ] All changes committed and pushed to `main` branch
- [ ] DigitalOcean account created and logged in
- [ ] GitHub account connected to DigitalOcean (Settings → API → GitHub)

## Database Setup

- [ ] Created MySQL database cluster on DigitalOcean
- [ ] Noted database connection details:
  - [ ] Host
  - [ ] Port (usually 25060)
  - [ ] Database name
  - [ ] Username
  - [ ] Password (saved securely)
- [ ] Configured database trusted sources (allow App Platform)

## App Deployment

- [ ] Created new App Platform app
- [ ] Connected GitHub repository
- [ ] Selected `main` branch
- [ ] Backend service configured:
  - [ ] Source directory: `backend`
  - [ ] Build command: `npm ci`
  - [ ] Run command: `node src/server.js`
  - [ ] Port: `8080`
- [ ] Environment variables added:
  - [ ] `PORT=8080`
  - [ ] `NODE_ENV=production`
  - [ ] `DB_HOST` (from database)
  - [ ] `DB_PORT` (from database)
  - [ ] `DB_USER` (from database)
  - [ ] `DB_PASSWORD` (from database, marked as SECRET)
  - [ ] `DB_NAME` (from database)
  - [ ] `JWT_SECRET` (generated random string, marked as SECRET)
- [ ] Admin panel configured (optional):
  - [ ] Source directory: `admin-panel`
  - [ ] Build command: `npm ci && npm run build`
  - [ ] Output directory: `dist`
  - [ ] `VITE_API_URL` set to backend URL (after first deploy)

## Post-Deployment

- [ ] App deployed successfully
- [ ] Backend health check passes: `/health` endpoint returns OK
- [ ] Database connectivity verified: `/ready` endpoint returns OK
- [ ] Database migrations run successfully
- [ ] Admin panel accessible (if deployed)
- [ ] Can login with default credentials:
  - [ ] Admin: `admin@healthapp.local` / `admin123`
  - [ ] Doctor: `doctor@healthapp.local` / `doctor123`
  - [ ] Assistant: `assistant@healthapp.local` / `assistant123`

## Security (Production)

- [ ] Changed default admin password
- [ ] Changed default doctor password
- [ ] Changed default assistant password
- [ ] Strong JWT_SECRET generated and set
- [ ] Database password is strong and secure
- [ ] Environment variables marked as SECRET where appropriate
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (default)

## Optional Features

- [ ] Daily.co API key configured (for video calls)
- [ ] SMTP configured (for email reminders)
- [ ] Twilio configured (for SMS reminders)
- [ ] Redis configured (for caching)
- [ ] Sentry configured (for error tracking)

## Monitoring

- [ ] App logs accessible
- [ ] Database monitoring enabled
- [ ] Health checks configured
- [ ] Alerts set up (optional)

## Documentation

- [ ] Deployment guide reviewed: `DEPLOYMENT-GUIDE.md`
- [ ] README.md reviewed
- [ ] Team members have access to:
  - [ ] DigitalOcean dashboard
  - [ ] GitHub repository
  - [ ] Database credentials (securely shared)

---

## Quick Commands Reference

### Generate JWT Secret (PowerShell)
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Test Backend Health
```bash
curl https://your-backend-url.ondigitalocean.app/health
```

### Test Database Connection
```bash
curl https://your-backend-url.ondigitalocean.app/ready
```

### Run Migrations (via Console)
```bash
node src/migrations/migrate.js
```

---

**Next Steps After Deployment:**
1. Update default passwords
2. Configure custom domain (optional)
3. Set up monitoring and alerts
4. Review and optimize costs
5. Document any custom configurations
