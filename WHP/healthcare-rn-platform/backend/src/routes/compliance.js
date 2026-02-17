/** Phase 2: Compliance & Security APIs */
import { query } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { encryptField, decryptField } from "../middleware/security.js";
import { auditLog } from "../middleware/audit.js";
import { asyncHandler } from "../utils/errorHandler.js";

export function registerComplianceRoutes(app, { authMiddleware, requirePatient, requireAdmin }) {
  // Consent management
  app.post("/api/compliance/consent", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
    const { consent_type, granted_to_type, granted_to_id, expires_at } = req.body;
    await query(
      "INSERT INTO patient_consents (patient_id, consent_type, granted_to_type, granted_to_id, expires_at, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.sub, consent_type, granted_to_type || null, granted_to_id || null, expires_at || null, req.ip]
    );
    auditLog(req, "consent_granted", "consent", null);
    res.status(201).json({ message: "Consent recorded" });
  }));

  app.get("/api/compliance/consents", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
    const consents = await query(
      "SELECT * FROM patient_consents WHERE patient_id = ? ORDER BY created_at DESC",
      [req.user.sub]
    );
    res.json({ consents });
  }));

  // GDPR: Data access request
  app.post("/api/compliance/gdpr/access", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
    await query(
      "INSERT INTO gdpr_requests (patient_id, request_type, status) VALUES (?, ?, 'pending')",
      [req.user.sub, "access"]
    );
    res.status(201).json({ message: "Data access request submitted" });
  }));

  // GDPR: Data deletion request
  app.post("/api/compliance/gdpr/delete", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
    await query(
      "INSERT INTO gdpr_requests (patient_id, request_type, status) VALUES (?, ?, 'pending')",
      [req.user.sub, "erasure"]
    );
    res.status(201).json({ message: "Data deletion request submitted" });
  }));

  // Anonymize data
  app.post("/api/compliance/anonymize", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { entity_type, entity_id } = req.body;
    if (entity_type == null || entity_id == null) {
      return res.status(400).json({ message: "entity_type and entity_id required" });
    }
    const anonymizedId = `anon-${uuidv4().slice(0, 8)}`;
    await query(
      "INSERT INTO anonymized_data (original_entity_type, original_entity_id, anonymized_id, anonymization_method) VALUES (?, ?, ?, ?)",
      [entity_type, entity_id, anonymizedId, "k-anonymity"]
    );
    res.json({ anonymized_id: anonymizedId });
  }));

  // Encrypt sensitive field
  app.post("/api/compliance/encrypt", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { field_value } = req.body;
    const encrypted = encryptField(field_value);
    res.json({ encrypted_value: encrypted });
  }));

  // Get GDPR requests (admin)
  app.get("/api/compliance/gdpr/requests", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const requests = await query("SELECT * FROM gdpr_requests ORDER BY requested_at DESC LIMIT 100");
    res.json({ requests });
  }));

  // Get all consents (admin)
  app.get("/api/compliance/consents/all", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const consents = await query("SELECT * FROM patient_consents ORDER BY created_at DESC LIMIT 100");
    res.json({ consents });
  }));
}
