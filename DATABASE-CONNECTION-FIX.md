# Database Connection Fix

## Issue

Error when trying to login:
```json
{
  "success": false,
  "error": {
    "message": "(conn:-1, no: 45028, SQLState: HY000) pool failed to retrieve a connection from pool (pool connections: active=0 idle=0 limit=10)"
  }
}
```

This means the database connection pool cannot establish connections to your DigitalOcean managed database.

## Root Cause

**DigitalOcean managed databases require SSL connections**, but the app wasn't configured to use SSL.

## Fix Applied

✅ **Updated `backend/src/db.js`:**
- Automatically detects DigitalOcean managed databases (port 25060 or host contains "ondigitalocean.com")
- Enables SSL with `rejectUnauthorized: false` (DO uses self-signed certs)
- Added `DB_SSL=true` env var option to force SSL if needed
- Improved error logging for connection failures

## What You Need to Do

### Option 1: Redeploy (Recommended)

1. **Commit and push** the updated `backend/src/db.js`:
   ```bash
   git add backend/src/db.js backend/src/routes/health.js backend/.env.example
   git commit -m "Fix database SSL for DigitalOcean managed DB"
   git push origin main
   ```

2. **Wait for auto-deploy** (or trigger manual deploy)

3. **Test the connection:**
   - Visit: `https://world-health-portal-gpeip.ondigitalocean.app/api/db-test`
   - Should show `"status": "connected"` if SSL fix worked

### Option 2: Force SSL via Environment Variable

If redeploy doesn't work, add this env var in DigitalOcean:

1. Go to your app → **Settings** → **App-Level Environment Variables**
2. Add:
   - **Key:** `DB_SSL`
   - **Value:** `true`
   - **Type:** General
3. **Save** and **Redeploy**

## Verify Database Access

1. **Check Database Trusted Sources:**
   - Go to your database cluster in DigitalOcean
   - **Settings** → **Trusted Sources**
   - Ensure **App Platform** is allowed (or add your app's IP)

2. **Verify Connection Details:**
   - In database cluster → **Connection Details**
   - Ensure `DB_HOST`, `DB_PORT` (25060), `DB_USER`, `DB_PASSWORD`, `DB_NAME` match your app's env vars

3. **Test Connection:**
   - Visit: `https://world-health-portal-gpeip.ondigitalocean.app/api/db-test`
   - Should return connection status and config (credentials masked)

## Diagnostic Endpoint

After deploying, you can check database connectivity:

**GET** `https://world-health-portal-gpeip.ondigitalocean.app/api/db-test`

Returns:
- Connection status
- Database config (credentials masked)
- Error details if connection fails
- SSL status

## Common Issues

### Still Getting Connection Errors?

1. **SSL not enabled:** Check `/api/db-test` - if `ssl: "disabled"`, add `DB_SSL=true` env var
2. **Wrong credentials:** Verify DB env vars match database connection details exactly
3. **Firewall:** Ensure database Trusted Sources includes App Platform
4. **Database not running:** Check database cluster status in DigitalOcean

### Port 25060 Not Detected?

If your DB port is 25060 but SSL still shows "disabled", add `DB_SSL=true` env var explicitly.

## Next Steps

After SSL is enabled and connection works:
1. ✅ Admin login should work: `POST /api/admin/login` with `{ "email", "password" }`
2. ✅ Database bootstrap will run automatically
3. ✅ All API endpoints will work

---

**Note:** The app will automatically enable SSL when it detects:
- Port 25060 (DO managed DB default)
- Host contains "ondigitalocean.com"
- `DB_SSL=true` env var is set
- Production mode + managed DB detected
