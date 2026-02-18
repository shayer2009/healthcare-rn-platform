/** Phase 2: Security & Compliance Middleware */
import crypto from "crypto";
import { query } from "../db.js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";

export function encryptField(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32), "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptField(encryptedText) {
  if (!encryptedText) return null;
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32), "hex"), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Note: auditLog moved to middleware/audit.js

// Check consent middleware
export async function checkConsent(req, res, next) {
  if (req.user?.role !== "patient") return next();
  const { consent_type, granted_to_type, granted_to_id } = req.body;
  if (!consent_type) return next();
  
  const [consent] = await query(
    "SELECT * FROM patient_consents WHERE patient_id = ? AND consent_type = ? AND granted_to_type = ? AND granted_to_id = ? AND (expires_at IS NULL OR expires_at > NOW()) AND granted = 1",
    [req.user.sub, consent_type, granted_to_type || null, granted_to_id || null]
  );
  
  if (!consent && consent_type === "data_sharing") {
    return res.status(403).json({ message: "Patient consent required for data sharing" });
  }
  next();
}

// Note: logDataAccess moved to middleware/audit.js
