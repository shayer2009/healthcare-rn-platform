/** Health Check & Readiness Endpoints */
import { query } from "../db.js";
import logger from "../utils/logger.js";
import { asyncHandler } from "../utils/errorHandler.js";

export function registerHealthRoutes(app) {
  // Root - welcome and links
  app.get("/", (req, res) => {
    res.type("html").send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>World Health Portal API</title></head>
<body style="font-family:system-ui;max-width:600px;margin:2rem auto;padding:0 1rem;">
  <h1>World Health Portal API</h1>
  <p>The API is running. Useful links:</p>
  <ul>
    <li><a href="/health">/health</a> — Health check</li>
    <li><a href="/ready">/ready</a> — Readiness (database)</li>
    <li><a href="/api-docs">/api-docs</a> — Swagger API documentation</li>
    <li><a href="/api/admin/login">POST /api/admin/login</a> — Admin login</li>
  </ul>
  <p><small>World Health Portal Backend</small></p>
</body>
</html>
    `);
  });

  // Health check - basic server status
  app.get("/health", asyncHandler(async (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  }));

  // Readiness check - database connectivity
  app.get("/ready", asyncHandler(async (req, res) => {
    try {
      await query("SELECT 1");
      res.json({
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error("Readiness check failed", { error: error.message });
      res.status(503).json({
        status: "not ready",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }));

  // Liveness check - for Kubernetes
  app.get("/live", (req, res) => {
    res.json({
      status: "alive",
      timestamp: new Date().toISOString()
    });
  });

  // Metrics endpoint (basic)
  app.get("/metrics", asyncHandler(async (req, res) => {
    try {
      const [dbStats] = await query("SELECT COUNT(*) as connections FROM information_schema.PROCESSLIST");
      const memoryUsage = process.memoryUsage();
      
      res.json({
        database: {
          connections: dbStats?.connections || 0
        },
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error("Metrics collection failed", { error: error.message });
      res.status(500).json({ error: "Failed to collect metrics" });
    }
  }));

  // Database connection diagnostic
  app.get("/api/db-test", asyncHandler(async (req, res) => {
    const dbConfig = {
      host: process.env.DB_HOST ? "***" : "not set",
      port: process.env.DB_PORT || "not set",
      user: process.env.DB_USER ? "***" : "not set",
      database: process.env.DB_NAME || "not set",
      ssl: process.env.DB_SSL === "true" || (process.env.NODE_ENV === "production" && Number(process.env.DB_PORT) === 25060) ? "enabled" : "disabled"
    };
    
    try {
      await query("SELECT 1 as test");
      res.json({
        status: "connected",
        config: dbConfig,
        message: "Database connection successful"
      });
    } catch (error) {
      res.status(503).json({
        status: "disconnected",
        config: dbConfig,
        error: error.message,
        code: error.code,
        sqlState: error.sqlState,
        hint: "Check DB credentials, SSL settings (DB_SSL=true for DO managed DB), and database Trusted Sources"
      });
    }
  }));
}
