/** Phase 3: Caching Layer */
import { createClient } from "redis";

let redisClient = null;
const cacheEnabled = process.env.REDIS_URL || process.env.REDIS_HOST;

try {
  if (cacheEnabled) {
    redisClient = createClient({ url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "localhost"}:6379` });
    redisClient.on("error", () => {});
    redisClient.connect().catch(() => {});
  }
} catch (e) {}

export async function getCache(key) {
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = 3600) {
  if (!redisClient || !redisClient.isOpen) return false;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function invalidateCache(pattern) {
  if (!redisClient || !redisClient.isOpen) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
  } catch {}
}

export function cacheMiddleware(ttlSeconds = 3600) {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();
    const cacheKey = `cache:${req.path}:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      setCache(cacheKey, data, ttlSeconds);
      return originalJson(data);
    };
    next();
  };
}
