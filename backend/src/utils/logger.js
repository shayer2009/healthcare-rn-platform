/** Structured Logging with Winston - safe for read-only/container envs (e.g. App Platform) */
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const transports = [
  new winston.transports.Console({ format: consoleFormat })
];

// Add file transports only when writable (skip in production/containers to avoid read-only FS crashes)
if (process.env.LOG_TO_FILES === "true") {
  try {
    const logsDir = path.join(__dirname, "../../logs");
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "14d"
      }),
      new DailyRotateFile({
        filename: path.join(logsDir, "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "30d"
      })
    );
  } catch (_) {
    // Use console only if filesystem not writable (e.g. App Platform)
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "world-health-portal" },
  transports
});

export default logger;
