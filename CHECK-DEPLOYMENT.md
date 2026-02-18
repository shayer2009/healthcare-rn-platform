# Deployment Diagnostic Checklist

If deployment is failing, check these common issues:

## 1. Check Build Logs in DigitalOcean

Go to your app → **Deployments** → Click the failed deployment → **View Logs**

Look for these errors:

### Build Phase Errors

**"npm ci" or "package-lock.json" errors:**
- ✅ Fixed: `USE_NPM_INSTALL=true` env var is set
- If still failing, verify the env var is set with `scope: BUILD_TIME`

**"Missing script: build":**
- ✅ Fixed: Backend has `"build": "echo No build step"` script
- Verify `backend/package.json` has the build script

**Module not found / ESM errors:**
- Check Node version - should be 18+ (set via `engines.node` in package.json)
- Verify `"type": "module"` in package.json

**Admin panel build errors:**
- Check if Vite build succeeds
- Verify `VITE_API_URL` is set (can be empty string for first deploy)

### Runtime Phase Errors

**"Failed to start backend" / "process exited":**
- ✅ Fixed: Server now starts BEFORE database bootstrap
- Check if database connection fails - app will still start but log errors
- Verify DB env vars are set: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**"Cannot connect to database":**
- Database env vars not set or incorrect
- Database not accessible from App Platform (check Trusted Sources)
- Database cluster not running

**"Port already in use" or "EADDRINUSE":**
- Verify `PORT=8080` is set
- Check `http_port: 8080` in app spec

**Health check failing:**
- App might be crashing before health endpoint responds
- Check runtime logs for errors
- Verify `/health` endpoint exists (it does in `routes/health.js`)

## 2. Verify Environment Variables

In DigitalOcean dashboard → Your App → **Settings** → **App-Level Environment Variables** (or component-level):

**Required for Backend:**
- [ ] `PORT=8080`
- [ ] `NODE_ENV=production`
- [ ] `DB_HOST` (from your database)
- [ ] `DB_PORT` (usually `25060` for managed DB)
- [ ] `DB_USER` (usually `doadmin`)
- [ ] `DB_PASSWORD` (from database - mark as SECRET)
- [ ] `DB_NAME` (usually `defaultdb`)
- [ ] `JWT_SECRET` (random string - mark as SECRET)

**Build-time (should be set automatically from app spec):**
- [ ] `USE_NPM_INSTALL=true` (BUILD_TIME scope)

**Optional:**
- `LOG_LEVEL=info` (or debug for troubleshooting)
- `REDIS_URL` (if using Redis)
- `DAILY_API_KEY` (for video)
- `SMTP_*` (for email)
- `TWILIO_*` (for SMS)

**For Admin Panel:**
- [ ] `VITE_API_URL` (set to backend URL after first deploy)

## 3. Check Database Access

1. Go to your database cluster in DigitalOcean
2. **Settings** → **Trusted Sources**
3. Ensure **App Platform** is allowed (or add your app's IP)
4. Test connection from app console:
   - Go to app → **Console** tab
   - Run: `node -e "const mariadb = require('mariadb'); mariadb.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME}).then(c => {console.log('Connected!'); c.end();}).catch(e => console.error('Failed:', e.message));"`

## 4. Verify App Spec Syntax

Check `.do/app.yaml`:
- YAML syntax is correct (indentation, no tabs)
- All required fields present
- `source_dir` matches your folder structure
- `build_command` and `run_command` are correct

## 5. Check GitHub Repository

- [ ] Code is pushed to GitHub
- [ ] Branch name matches (`main` in app spec)
- [ ] Repository name matches (`shayer2009/healthcare-rn-platform`)
- [ ] DigitalOcean has access to the repo (Settings → API → GitHub)

## 6. Common Fixes

### If build fails:
1. Clear build cache: App → **Actions** → **Force Build and Deploy** → Check **Clear Build Cache**
2. Verify `USE_NPM_INSTALL=true` is set with BUILD_TIME scope
3. Check Node version compatibility

### If runtime fails:
1. Check runtime logs (not build logs)
2. Verify all DB env vars are set correctly
3. Check database is running and accessible
4. Verify PORT matches http_port (8080)

### If health check fails:
1. App might be crashing - check runtime logs
2. Verify `/health` endpoint is accessible
3. Increase `initial_delay_seconds` if app takes time to start

## 7. Get Detailed Logs

**Build logs:**
- App → Deployments → Failed deployment → Build Logs

**Runtime logs:**
- App → Runtime Logs tab
- Or: App → Components → Backend → Runtime Logs

**Console access:**
- App → Console tab → Select backend component
- Run commands to test database, check env vars, etc.

## 8. Quick Test Commands

Once app is running, test from console:

```bash
# Check environment variables
env | grep DB
env | grep PORT

# Test database connection
node -e "const mariadb = require('mariadb'); mariadb.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME}).then(c => {console.log('DB OK'); c.end();}).catch(e => console.error('DB FAIL:', e.message));"

# Test health endpoint
curl http://localhost:8080/health

# Check if server is listening
netstat -tuln | grep 8080
```

## 9. Still Failing?

Share these details:
1. **Phase:** Build or Runtime?
2. **Error message:** Exact error from logs
3. **Component:** Backend or Admin Panel?
4. **Log snippet:** Last 20-30 lines of the failed log

This will help identify the specific issue.
