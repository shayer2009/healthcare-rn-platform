/** Enterprise APIs for all 13 features */
import { query } from "../db.js";
import { asyncHandler } from "../utils/errorHandler.js";

function randomId() {
  return "room-" + Math.random().toString(36).slice(2, 10);
}

// Helper to get setting
async function getSetting(key) {
  const rows = await query("SELECT setting_value FROM app_settings WHERE setting_key = ?", [key]);
  return rows[0]?.setting_value ?? "0";
}

/** Register enterprise routes on the app */
export function registerEnterpriseRoutes(app, { authMiddleware, requireAdmin, requireDoctor, requirePatient, requireAssistant }) {
  // ---------- 13. Multi-tenancy + Enterprise settings ----------
  app.get("/api/admin/enterprise-settings", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const rows = await query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE 'multitenancy_%' OR setting_key IN ('video_enabled','scheduling_enabled','mfa_enabled','ehr_enabled','eprescribing_enabled','payments_enabled','notifications_enabled','intake_forms_enabled','analytics_enabled','integrations_enabled','audit_logging_enabled')");
    const settings = rows.reduce((acc, r) => {
      acc[r.setting_key] = r.setting_value === "1";
      return acc;
    }, {});
    res.json({ settings });
  }));

  app.put("/api/admin/enterprise-settings/:key", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { enabled } = req.body;
    const allowed = ["multitenancy_enabled","video_enabled","scheduling_enabled","mfa_enabled","ehr_enabled","eprescribing_enabled","payments_enabled","notifications_enabled","intake_forms_enabled","analytics_enabled","integrations_enabled","audit_logging_enabled"];
    if (!allowed.includes(key)) return res.status(400).json({ message: "Invalid setting key" });
    await query(
      "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
      [key, enabled ? "1" : "0"]
    );
    return res.json({ message: "Setting updated" });
  }));

  app.get("/api/admin/organizations", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const multitenancy = await getSetting("multitenancy_enabled");
    if (multitenancy !== "1") return res.json({ organizations: [] });
    const orgs = await query("SELECT id, name, slug, created_at FROM organizations");
    res.json({ organizations: orgs });
  }));

  app.post("/api/admin/organizations", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const multitenancy = await getSetting("multitenancy_enabled");
    if (multitenancy !== "1") return res.status(400).json({ message: "Multitenancy is disabled" });
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ message: "Name and slug required" });
    await query("INSERT INTO organizations (name, slug) VALUES (?, ?)", [name, slug]);
    res.status(201).json({ message: "Organization created" });
  }));

  // ---------- 2. Appointments ----------
  app.get("/api/appointments", authMiddleware, asyncHandler(async (req, res) => {
    const { role, sub } = req.user;
    let sql = `SELECT a.*, p.name as patient_name, d.name as doctor_name FROM appointments a 
      JOIN patients p ON p.id = a.patient_id JOIN doctors d ON d.id = a.doctor_id WHERE 1=1`;
    const params = [];
    if (role === "patient") { sql += " AND a.patient_id = ?"; params.push(sub); }
    if (role === "doctor") { sql += " AND a.doctor_id = ?"; params.push(sub); }
    if (role === "assistant" && req.user.doctorId) { sql += " AND a.doctor_id = ?"; params.push(req.user.doctorId); }
    sql += " ORDER BY a.slot_start DESC LIMIT 100";
    const rows = await query(sql, params);
    res.json({ appointments: rows });
  }));

  app.post("/api/appointments", authMiddleware, asyncHandler(async (req, res) => {
    const { patient_id, doctor_id, slot_start, slot_end, notes } = req.body;
    if (!patient_id || !doctor_id || !slot_start) return res.status(400).json({ message: "Missing required fields" });
    const result = await query(
      "INSERT INTO appointments (patient_id, doctor_id, slot_start, slot_end, notes) VALUES (?, ?, ?, ?, ?)",
      [patient_id, doctor_id, slot_start, slot_end || slot_start, notes || null]
    );
    if (!result.insertId) {
      return res.status(500).json({ message: "Failed to create appointment" });
    }
    res.status(201).json({ id: result.insertId, message: "Appointment created" });
  }));

  // ---------- 3. Audit logs ----------
  app.get("/api/admin/audit-logs", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200");
    res.json({ logs: rows });
  }));

  // ---------- 4. Clinical records ----------
  app.get("/api/clinical/notes/:patientId", authMiddleware, asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY created_at DESC", [req.params.patientId]);
    res.json({ notes: rows || [] });
  }));

  app.get("/api/clinical/vitals/:patientId", authMiddleware, asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 50", [req.params.patientId]);
    res.json({ vitals: rows });
  }));

  app.get("/api/clinical/allergies/:patientId", authMiddleware, asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM patient_allergies WHERE patient_id = ?", [req.params.patientId]);
    res.json({ allergies: rows });
  }));

  // ---------- 5. Prescriptions ----------
  app.get("/api/prescriptions", authMiddleware, asyncHandler(async (req, res) => {
    const { role, sub } = req.user;
    let sql = "SELECT pr.*, p.name as patient_name, d.name as doctor_name FROM prescriptions pr JOIN patients p ON p.id = pr.patient_id JOIN doctors d ON d.id = pr.doctor_id WHERE 1=1";
    const params = [];
    if (role === "patient") { sql += " AND pr.patient_id = ?"; params.push(sub); }
    if (role === "doctor") { sql += " AND pr.doctor_id = ?"; params.push(sub); }
    if (role === "assistant" && req.user.doctorId) { sql += " AND pr.doctor_id = ?"; params.push(req.user.doctorId); }
    sql += " ORDER BY pr.prescribed_at DESC LIMIT 100";
    const rows = await query(sql, params);
    res.json({ prescriptions: rows });
  }));

  // ---------- 6. Invoices ----------
  app.get("/api/invoices", authMiddleware, asyncHandler(async (req, res) => {
    const { role, sub } = req.user;
    let sql = "SELECT * FROM invoices WHERE 1=1";
    const params = [];
    if (role === "patient") { sql += " AND patient_id = ?"; params.push(sub); }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const rows = await query(sql, params);
    res.json({ invoices: rows });
  }));

  // ---------- 7. Notifications ----------
  app.get("/api/notifications", authMiddleware, asyncHandler(async (req, res) => {
    const ut = req.user.role === "admin" ? "admin" : req.user.role === "doctor" ? "doctor" : req.user.role === "assistant" ? "assistant" : "patient";
    const uid = req.user.sub;
    const rows = await query("SELECT * FROM notifications WHERE user_type = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50", [ut, uid]);
    res.json({ notifications: rows });
  }));

  // ---------- 8. Intake forms ----------
  app.get("/api/intake-forms/:patientId", authMiddleware, asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM intake_forms WHERE patient_id = ? ORDER BY submitted_at DESC", [req.params.patientId]);
    res.json({ forms: rows });
  }));

  app.post("/api/intake-forms", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
    const { appointment_id, form_data } = req.body;
    await query("INSERT INTO intake_forms (patient_id, appointment_id, form_data) VALUES (?, ?, ?)", [req.user.sub, appointment_id || null, JSON.stringify(form_data || {})]);
    res.status(201).json({ message: "Form submitted" });
  }));

  // ---------- 9. Doctor availability ----------
  app.get("/api/doctor-availability/:doctorId", authMiddleware, asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM doctor_availability WHERE doctor_id = ?", [req.params.doctorId]);
    res.json({ availability: rows });
  }));

  app.put("/api/doctor-availability/:doctorId", authMiddleware, requireDoctor, asyncHandler(async (req, res) => {
    if (Number(req.params.doctorId) !== req.user.sub && req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    const { slots } = req.body;
    if (!Array.isArray(slots)) return res.status(400).json({ message: "slots must be an array" });
    await query("DELETE FROM doctor_availability WHERE doctor_id = ?", [req.params.doctorId]);
    for (const s of slots) {
      if (!s.day_of_week || !s.start_time || !s.end_time) {
        continue; // Skip invalid slots
      }
      await query("INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)", [req.params.doctorId, s.day_of_week, s.start_time, s.end_time]);
    }
    res.json({ message: "Availability updated" });
  }));

  // ---------- 10. Analytics ----------
  app.get("/api/admin/analytics", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const [patients] = await query("SELECT COUNT(*) as c FROM patients");
    const [doctors] = await query("SELECT COUNT(*) as c FROM doctors");
    const [appts] = await query("SELECT COUNT(*) as c FROM appointments WHERE status = 'completed'");
    const [revenue] = await query("SELECT COALESCE(SUM(amount), 0) as t FROM invoices WHERE status = 'paid'");
    res.json({
      totalPatients: patients?.c || 0,
      totalDoctors: doctors?.c || 0,
      completedConsultations: appts?.c || 0,
      totalRevenue: Number(revenue?.t || 0)
    });
  }));

  // ---------- 11. Integrations ----------
  app.get("/api/admin/integrations", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const rows = await query("SELECT id, integration_type, enabled, created_at FROM integrations");
    res.json({ integrations: rows });
  }));

  app.post("/api/admin/integrations", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { integration_type, config } = req.body;
    await query("INSERT INTO integrations (integration_type, config) VALUES (?, ?)", [integration_type || "generic", JSON.stringify(config || {})]);
    res.status(201).json({ message: "Integration added" });
  }));

  // ---------- 12. System status ----------
  app.get("/api/system/status", asyncHandler(async (req, res) => {
    try {
      await query("SELECT 1");
      res.json({ db: "ok", status: "healthy" });
    } catch (e) {
      res.status(503).json({ db: "error", status: "degraded" });
    }
  }));
}
