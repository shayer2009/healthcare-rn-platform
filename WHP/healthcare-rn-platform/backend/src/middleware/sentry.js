/** Sentry Error Tracking Integration */
import logger from "../utils/logger.js";

let Sentry = null;

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    import("@sentry/node").then((module) => {
      Sentry = module.default;
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0
      });
      logger.info("Sentry initialized");
    }).catch((e) => {
      logger.warn("Sentry not available", { error: e.message });
    });
  }
}

export function captureException(error, context = {}) {
  if (Sentry) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message, level = "info", context = {}) {
  if (Sentry) {
    Sentry.captureMessage(message, { level, extra: context });
  }
}
