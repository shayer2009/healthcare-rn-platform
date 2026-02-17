# Production Deployment Guide

This guide covers deploying the World Health Portal to production with all critical fixes, security, operations, and hardening implemented.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MariaDB 10.11+
- Redis 7+
- Domain name with SSL certificate
- Production server (VPS, AWS, DigitalOcean, etc.)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository>
cd healthcare-rn-platform
```

### 2. Configure Environment Variables

```bash
cd backend
cp .env.example .env
# Edit .env with production values
```

Required environment variables:
```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-secure-random-string>
DB_HOST=<database-host>
DB_PORT=3306
DB_USER=<database-user>
DB_PASSWORD=<secure-password>
DB_NAME=healthcare_app
REDIS_URL=redis://redis:6379
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=info
API_URL=https://api.yourdomain.com
ENCRYPTION_KEY=<generate-32-byte-hex-key>
```

Generate secrets:
```bash
# JWT Secret
openssl rand -base64 32

# Encryption Key
openssl rand -hex 32
```

### 3. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Run Migrations

```bash
docker exec -it whp-backend npm run migrate
```

### 5. Verify Deployment

```bash
# Health check
curl http://localhost:4000/health

# Readiness check
curl http://localhost:4000/ready

# API Documentation
open http://localhost:4000/api-docs
```

## Features Implemented

### ✅ Phase A: Critical Fixes
- [x] Comprehensive testing (Jest + Supertest)
- [x] Structured logging (Winston)
- [x] Error tracking (Sentry)
- [x] API documentation (Swagger/OpenAPI)
- [x] Database migrations (Knex)
- [x] Input validation (Joi)
- [x] Health checks (`/health`, `/ready`, `/live`, `/metrics`)
- [x] CI/CD pipeline (GitHub Actions)

### ✅ Phase B: Security & Compliance
- [x] Secrets management (AWS Secrets Manager / Vault support)
- [x] Security headers (Helmet)
- [x] Input sanitization
- [x] Dependency vulnerability scanning (npm audit in CI)
- [x] HTTPS/TLS ready (configure reverse proxy)

### ✅ Phase C: Operations
- [x] Automated backups (backup utility)
- [x] Monitoring endpoints (`/metrics`)
- [x] Containerization (Dockerfiles)
- [x] Health checks
- [x] Graceful shutdown

### ✅ Phase D: Production Hardening
- [x] API versioning middleware
- [x] Transaction management
- [x] Database connection pooling optimization
- [x] Cache invalidation tracking
- [x] Error handling middleware

## Production Checklist

### Before Deployment
- [ ] Set all environment variables
- [ ] Generate secure secrets (JWT, encryption keys)
- [ ] Configure SSL/TLS certificate
- [ ] Set up database backups
- [ ] Configure Sentry for error tracking
- [ ] Set up monitoring (Prometheus, Datadog, etc.)
- [ ] Review security settings
- [ ] Test health check endpoints
- [ ] Run database migrations
- [ ] Load test the application

### Post-Deployment
- [ ] Verify all endpoints are accessible
- [ ] Check logs for errors
- [ ] Monitor `/metrics` endpoint
- [ ] Test backup restoration
- [ ] Set up alerting
- [ ] Review API documentation at `/api-docs`
- [ ] Monitor Sentry for errors

## Monitoring

### Health Endpoints
- `GET /health` - Basic health check
- `GET /ready` - Readiness check (database connectivity)
- `GET /live` - Liveness check (Kubernetes)
- `GET /metrics` - Basic metrics (memory, DB connections)

### Logs
Logs are stored in `backend/logs/`:
- `error-YYYY-MM-DD.log` - Error logs
- `combined-YYYY-MM-DD.log` - All logs

### Metrics
Access metrics at `/metrics`:
```json
{
  "database": { "connections": 2 },
  "memory": {
    "heapUsed": 45,
    "heapTotal": 67,
    "rss": 120
  },
  "uptime": 3600
}
```

## Backup Strategy

### Automated Backups
```bash
# Run backup manually
docker exec -it whp-backend node -e "import('./src/utils/backup.js').then(m => m.backupDatabase())"

# Schedule daily backups (cron)
0 2 * * * docker exec whp-backend node -e "import('./src/utils/backup.js').then(m => m.backupDatabase())"
```

### Backup Restoration
```bash
mysql -h <host> -u <user> -p <database> < backup-YYYY-MM-DD.sql
```

## Scaling

### Horizontal Scaling
1. Use load balancer (nginx, HAProxy)
2. Deploy multiple backend instances
3. Use Redis for shared session storage
4. Configure database read replicas

### Vertical Scaling
1. Increase database connection pool
2. Add more Redis memory
3. Increase server resources

## Security Hardening

### SSL/TLS
Configure reverse proxy (nginx) with Let's Encrypt:
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Firewall
```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

## Troubleshooting

### Database Connection Issues
```bash
# Check database connectivity
docker exec -it whp-backend node -e "import('./src/db.js').then(m => m.query('SELECT 1'))"
```

### Redis Connection Issues
```bash
# Test Redis
docker exec -it whp-redis redis-cli ping
```

### Application Errors
1. Check logs: `docker logs whp-backend`
2. Check Sentry dashboard
3. Review `/metrics` endpoint
4. Check database connection pool

## Support

For issues or questions:
- Check API documentation: `/api-docs`
- Review logs in `backend/logs/`
- Monitor Sentry for errors
- Check health endpoints
