/** Centralized Error Handling */
import logger from "./logger.js";
import { captureException } from "../middleware/sentry.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational !== false;

  // Log error
  if (statusCode >= 500) {
    logger.error("Server Error", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      user: req.user?.sub || "anonymous"
    });
    // Send to Sentry
    captureException(err, {
      path: req.path,
      method: req.method,
      user: req.user?.sub || "anonymous"
    });
  } else {
    logger.warn("Client Error", {
      error: err.message,
      path: req.path,
      method: req.method,
      statusCode,
      user: req.user?.sub || "anonymous"
    });
  }

  // Send error response
  const response = {
    success: false,
    error: {
      message: isOperational ? err.message : "Internal server error",
      ...(err.errors && { errors: err.errors }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    }
  };
  res.status(statusCode).json(response);
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res, next) {
  // Redirect /api/admin and /api/admin/ to login; /admin/ to /admin
  if (req.method === "GET") {
    if (req.path === "/api/admin" || req.path === "/api/admin/") return res.redirect(302, "/api/admin/login");
    if (req.path === "/admin/") return res.redirect(302, "/admin");
  }
  const error = new AppError(`Route ${req.path} not found`, 404);
  next(error);
}
