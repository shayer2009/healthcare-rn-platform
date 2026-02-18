import mysql from "mysql2/promise";
import dotenv from "dotenv";
import logger from "./utils/logger.js";

dotenv.config();

// SSL configuration for DigitalOcean managed databases (MySQL)
const dbPort = Number(process.env.DB_PORT || 3307);
const isProduction = process.env.NODE_ENV === "production";
const isManagedDB = process.env.DB_HOST && (
  process.env.DB_HOST.includes("ondigitalocean.com") ||
  process.env.DB_HOST.includes("db.ondigitalocean.com") ||
  dbPort === 25060 // DO managed DB default port
);

const poolConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: dbPort,
  user: process.env.DB_USER || "health_user",
  password: process.env.DB_PASSWORD || "health_pass",
  database: process.env.DB_NAME || "healthcare_app",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  connectTimeout: 60000,
  queueLimit: 0
};

// Enable SSL for DigitalOcean managed databases (required for port 25060)
if (process.env.DB_SSL === "true" || dbPort === 25060 || (isProduction && isManagedDB)) {
  poolConfig.ssl = {
    rejectUnauthorized: false // DO uses self-signed certificates
  };
  logger.info("Database SSL enabled", { host: poolConfig.host, port: poolConfig.port });
}

export const pool = mysql.createPool(poolConfig);

export async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [result] = await conn.query(sql, params);
    return result;
  } catch (error) {
    logger.error("Database query failed", {
      error: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sql: sql.substring(0, 100)
    });
    throw error;
  } finally {
    if (conn) conn.release();
  }
}
