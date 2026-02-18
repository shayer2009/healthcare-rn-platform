import { createPool } from "mariadb";
import dotenv from "dotenv";
import logger from "./utils/logger.js";

dotenv.config();

export const pool = createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || "health_user",
  password: process.env.DB_PASSWORD || "health_pass",
  database: process.env.DB_NAME || "healthcare_app",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  acquireTimeout: 60000,
  timeout: 60000
});

// Log connection events
pool.on("connection", (conn) => {
  logger.debug("New database connection", { threadId: conn.threadId });
});

pool.on("error", (err) => {
  logger.error("Database pool error", { error: err.message });
});

export async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}
