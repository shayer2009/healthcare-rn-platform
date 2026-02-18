/** Enhanced audit logging with compliance tracking */
import { query } from "../db.js";
import logger from "../utils/logger.js";

export function auditLog(req, action, resource = null, resourceId = null, details = {}) {
  const auditData = {
    method: req.method,
    path: req.path,
    user_agent: req.headers["user-agent"],
    ...details
  };
  
  query(
    "INSERT INTO audit_logs (user_id, user_role, action, resource, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      req.user?.sub || null,
      req.user?.role || null,
      action,
      resource,
      resourceId,
      JSON.stringify(auditData),
      req.ip || req.connection?.remoteAddress || req.headers["x-forwarded-for"] || "unknown"
    ]
  ).catch((error) => {
    logger.error("Audit log failed", { error: error.message, action, resource });
  });
}

// GDPR: Log all data access
export function logDataAccess(req, resourceType, resourceId, dataFields = []) {
  if (req.user?.role === "patient") {
    auditLog(req, "data_access", resourceType, resourceId, { data_fields: dataFields });
  }
}
