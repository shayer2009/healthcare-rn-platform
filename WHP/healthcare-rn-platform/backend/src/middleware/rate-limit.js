/** Phase 3: Rate Limiting with Redis fallback */
import rateLimit from "express-rate-limit";
import { createClient } from "redis";

let redisClient = null;
try {
  redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  redisClient.on("error", (err) => console.warn("Redis not available:", err.message));
  redisClient.connect().catch(() => {});
} catch (e) {
  console.warn("Redis not configured");
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: "Too many requests, please try again later" });
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 min
  skipSuccessfulRequests: true
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
});

// Redis-backed rate limiter for advanced use
export async function redisRateLimit(key, limit, windowMs) {
  if (!redisClient || !redisClient.isOpen) return true;
  try {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, Math.floor(windowMs / 1000));
    return count <= limit;
  } catch {
    return true; // Fail open if Redis unavailable
  }
}
