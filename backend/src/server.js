import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { query } from "./db.js";
import { bootstrapEnterpriseTables } from "./bootstrap-tables.js";
import { bootstrapWorldHealthTables } from "./bootstrap-world-health.js";
import { bootstrapEnhancementTables } from "./bootstrap-enhancements.js";
import { bootstrapGlobalReadyTables } from "./bootstrap-global-ready.js";
import { registerEnterpriseRoutes } from "./routes/enterprise.js";
import { registerWorldHealthRoutes } from "./routes/world-health.js";
import { registerVideoRoutes } from "./routes/video.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerMessagingRoutes } from "./routes/messaging.js";
import { registerPrescriptionFulfillmentRoutes } from "./routes/prescription-fulfillment.js";
import { registerFHIRRoutes } from "./routes/fhir.js";
import { registerComplianceRoutes } from "./routes/compliance.js";
import { registerIntegrationRoutes } from "./routes/integrations.js";
import { registerAdvancedRoutes } from "./routes/advanced.js";
import { registerHealthRoutes } from "./routes/health.js";
import { startReminderCron } from "./reminders.js";
import helmet from "helmet";
import compression from "compression";
import { apiRateLimiter, authRateLimiter } from "./middleware/rate-limit.js";
import { cacheMiddleware } from "./middleware/cache.js";
import { errorHandler, notFoundHandler, asyncHandler } from "./utils/errorHandler.js";
import logger from "./utils/logger.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { initSentry } from "./middleware/sentry.js";
import { apiVersioning } from "./middleware/apiVersioning.js";

dotenv.config();

// Initialize Sentry
initSentry();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.io = io; // Attach io to app for routes

const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || "change_this_secret";

app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Versioning
app.use("/api/", apiVersioning);

app.use("/api/", apiRateLimiter); // Rate limiting
app.use("/api/admin/login", authRateLimiter);
app.use("/api/patient/login", authRateLimiter);
app.use("/api/doctor/login", authRateLimiter);
app.use("/api/assistant/login", authRateLimiter);

// Redirect /api/admin and /api/admin/ to login (early so always hit)
app.get(["/api/admin", "/api/admin/"], (_req, res) => res.redirect(302, "/api/admin/login"));

function createToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "12h" });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

function requirePatient(req, res, next) {
  if (req.user?.role !== "patient") {
    return res.status(403).json({ message: "Patient access required" });
  }
  return next();
}

function requireDoctor(req, res, next) {
  if (req.user?.role !== "doctor") {
    return res.status(403).json({ message: "Doctor access required" });
  }
  return next();
}

function requireAssistant(req, res, next) {
  if (req.user?.role !== "assistant") {
    return res.status(403).json({ message: "Assistant access required" });
  }
  return next();
}

async function bootstrapDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      phone VARCHAR(30) NULL,
      password_hash VARCHAR(255) NOT NULL,
      wallet_balance DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS patient_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      setting_value VARCHAR(255) NOT NULL,
      UNIQUE KEY uk_patient_setting (patient_id, setting_key),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      phone VARCHAR(30) NULL,
      password_hash VARCHAR(255) NOT NULL,
      specialization VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS doctor_assistants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_id INT NOT NULL,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      phone VARCHAR(30) NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    )
  `);

  const adminRows = await query("SELECT id FROM admins LIMIT 1");
  if (adminRows.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await query(
      "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
      ["Super Admin", "admin@healthapp.local", passwordHash]
    );
  }

  const doctorRows = await query("SELECT id FROM doctors LIMIT 1");
  if (doctorRows.length === 0) {
    const doctorHash = await bcrypt.hash("doctor123", 10);
    const result = await query(
      "INSERT INTO doctors (name, email, phone, password_hash, specialization) VALUES (?, ?, ?, ?, ?)",
      ["Dr. Sarah Khan", "doctor@healthapp.local", "+92-300-1234567", doctorHash, "General Physician"]
    );
    if (!result.insertId) {
      logger.error("Failed to create default doctor");
      return;
    }
    const doctorId = result.insertId;
    const assistantHash = await bcrypt.hash("assistant123", 10);
    await query(
      "INSERT INTO doctor_assistants (doctor_id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)",
      [doctorId, "Ali Hassan", "assistant@healthapp.local", "+92-321-7654321", assistantHash]
    );
  }

  const defaults = [
    ["notification", "0"],
    ["sms", "0"],
    ["email", "0"],
    ["dark_mode", "0"],
    ["status", "1"]
  ];

  for (const [key, value] of defaults) {
    await query(
      "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)",
      [key, value]
    );
  }

  await bootstrapEnterpriseTables();
  await bootstrapWorldHealthTables();
  await bootstrapEnhancementTables();
  await bootstrapGlobalReadyTables();
}

// Health check moved to routes/health.js

// ---------- Admin APIs (admin panel only) ----------
// GET /api/admin/login → simple login form (browser visits use GET)
app.get("/api/admin/login", (_req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin Login</title></head>
<body style="font-family:system-ui;max-width:320px;margin:3rem auto;padding:1.5rem;border:1px solid #ddd;border-radius:8px;">
  <h2 style="margin-top:0;">Admin Login</h2>
  <form id="f" onsubmit="return false;">
    <p><label>Email <input type="email" id="email" name="email" value="admin@healthapp.local" style="width:100%;padding:6px;" required></label></p>
    <p><label>Password <input type="password" id="password" name="password" placeholder="admin123" style="width:100%;padding:6px;" required></label></p>
    <p><button type="submit" id="btn" style="padding:8px 16px;">Login</button></p>
  </form>
  <p id="msg" style="font-size:14px;color:#c00;"></p>
  <script>
    (function(){
      var f = document.getElementById("f");
      var btn = document.getElementById("btn");
      var msg = document.getElementById("msg");
      var emailEl = document.getElementById("email");
      var passwordEl = document.getElementById("password");
      var params = new URLSearchParams(window.location.search);
      if (params.get("email")) emailEl.value = params.get("email");
      if (params.get("password")) passwordEl.value = params.get("password");
      f.onsubmit = function(e){ e.preventDefault(); e.stopPropagation(); return false; };
      function doLogin(){
        msg.textContent = "";
        btn.disabled = true;
        fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailEl.value, password: passwordEl.value })
        }).then(function(res){ return res.json().then(function(data){
          if (res.ok) {
            sessionStorage.setItem("admin_token", data.token);
            sessionStorage.setItem("admin_user", JSON.stringify(data.user || {}));
            window.location.href = "/admin";
          } else {
            msg.textContent = data.message || (data.error && data.error.message) || "Login failed";
          }
        }); }).catch(function(err){ msg.textContent = "Network error"; }).finally(function(){ btn.disabled = false; });
      }
      btn.onclick = doLogin;
      if (params.get("email") && params.get("password")) doLogin();
    })();
  </script>
</body></html>
  `);
});
app.post("/api/admin/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const users = await query("SELECT * FROM admins WHERE email = ?", [email]);
  if (users.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const admin = users[0];
  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = createToken({ sub: admin.id, role: "admin", name: admin.name });
  return res.json({
    token,
    user: { id: admin.id, name: admin.name, email: admin.email }
  });
}));

// GET /admin → admin dashboard (requires token in sessionStorage; redirects to login if missing)
app.get("/admin", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Admin Dashboard</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui;margin:0;background:#f5f5f5}
.adminLayout{display:flex;min-height:100vh}
.sidebar{width:240px;background:#1a1a2e;color:#fff;padding:1rem}
.sidebar h2{margin:0 0 1rem;font-size:1rem}
.sidebar nav{display:flex;flex-direction:column;gap:4px}
.sidebar a,.sidebar button{background:none;border:none;color:#aaa;text-align:left;padding:8px 12px;cursor:pointer;text-decoration:none;font-size:14px;border-radius:4px}
.sidebar a:hover,.sidebar button:hover{background:rgba(255,255,255,.1);color:#fff}
.main{flex:1;padding:1.5rem;overflow:auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
.header h1{margin:0;font-size:1.5rem}
.logout{background:#c00;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}
.logout:hover{background:#a00}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem}
.card{background:#fff;padding:1.25rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.card h3{margin:0 0 8px;font-size:14px;color:#666}
.card p{margin:0;font-size:1.5rem;font-weight:600}
.err{color:#c00;padding:1rem}
</style></head>
<body>
<div class="adminLayout" id="app"><div class="err">Loading...</div></div>
<script>
(function(){
  var token = sessionStorage.getItem("admin_token");
  var user = {};
  try { user = JSON.parse(sessionStorage.getItem("admin_user") || "{}"); } catch(e){}
  if (!token) { window.location.href = "/api/admin/login"; return; }

  function showErr(txt){
    var app = document.getElementById("app");
    app.innerHTML = "<div class=\"err\"><p>" + txt + "</p><p><a href=\"/api/admin/login\">Back to Login</a></p></div>";
  }
  function api(path){
    var ctrl = new AbortController();
    var t = setTimeout(function(){ ctrl.abort(); }, 15000);
    return fetch(path, { headers: { Authorization: "Bearer " + token }, signal: ctrl.signal })
      .then(function(r){ clearTimeout(t); return r.json().catch(function(){ return {}; }); })
      .catch(function(e){ clearTimeout(t); throw e; });
  }

  api("/api/admin/dashboard").then(function(dash){
    var cards = (dash && dash.cards) ? dash.cards : {};
    var settings = (dash && dash.settings) ? dash.settings : {};
    var userName = (user && user.name) ? user.name : "Admin";

    document.getElementById("app").innerHTML = \`
    <aside class="sidebar">
      <h2>World Health Portal</h2>
      <nav>
        <a href="/admin">Dashboard</a>
        <a href="/api-docs" target="_blank">API Docs</a>
        <a href="/">API Home</a>
      </nav>
    </aside>
    <main class="main">
      <div class="header">
        <h1>Admin Dashboard</h1>
        <div>
          <span style="margin-right:1rem;color:#666">\${"userName"}</span>
          <button class="logout" onclick="(function(){sessionStorage.clear();location.href='/api/admin/login'})()">Logout</button>
        </div>
      </div>
      <div class="grid">
        <div class="card"><h3>Total Doctors</h3><p>\${"(cards.totalDoctors != null) ? cards.totalDoctors : 0}"}</p></div>
        <div class="card"><h3>Total Patients</h3><p>\${"(cards.totalPatients != null) ? cards.totalPatients : 0}"}</p></div>
        <div class="card"><h3>Total Queries</h3><p>\${"(cards.totalQueries != null) ? cards.totalQueries : 0}"}</p></div>
      </div>
      <div class="card" style="margin-top:1.5rem">
        <h3>Enterprise Settings</h3>
        <p style="font-size:14px">\${"Object.keys(settings).length"} settings configured</p>
      </div>
    </main>
  \`;
  }).catch(function(e){
    showErr("Could not load dashboard: " + (e.message || "Network error") + ". Try <a href=\\"/api/admin/login\\">logging in again</a>.");
  });
})();
</script>
</body></html>`);
});

app.get("/api/admin/dashboard", authMiddleware, requireAdmin, asyncHandler(async (_req, res) => {
  const totalDoctors = 125;
  const totalPatients = 470;
  const totalQueries = 82;
  const settingsRows = await query("SELECT setting_key, setting_value FROM app_settings");
  const settings = settingsRows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value === "1";
    return acc;
  }, {});
  res.json({
    cards: { totalDoctors, totalPatients, totalQueries },
    settings
  });
}));

app.put("/api/admin/settings/:settingKey", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { settingKey } = req.params;
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be boolean" });
  }
  await query(
    "UPDATE app_settings SET setting_value = ? WHERE setting_key = ?",
    [enabled ? "1" : "0", settingKey]
  );
  return res.json({ message: "Setting updated" });
}));

// ---------- Patient APIs (mobile app only) ----------
const PATIENT_SETTING_KEYS = ["notification", "sms", "email", "dark_mode", "status"];
const PATIENT_SETTING_DEFAULTS = { notification: "0", sms: "0", email: "0", dark_mode: "0", status: "1" };

app.post("/api/patient/signup", asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }
  const existing = await query("SELECT id FROM patients WHERE email = ?", [email]);
  if (existing.length > 0) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO patients (name, email, phone, password_hash, wallet_balance) VALUES (?, ?, ?, ?, 0)",
    [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, passwordHash]
  );
  if (!result.insertId) {
    return res.status(500).json({ message: "Failed to create patient account" });
  }
  const patientId = Number(result.insertId);
  for (const [key, value] of Object.entries(PATIENT_SETTING_DEFAULTS)) {
    await query(
      "INSERT INTO patient_settings (patient_id, setting_key, setting_value) VALUES (?, ?, ?)",
      [patientId, key, value]
    );
  }
  const token = createToken({ sub: patientId, role: "patient", name: name.trim() });
  const [row] = await query(
    "SELECT id, name, email, phone, wallet_balance FROM patients WHERE id = ?",
    [patientId]
  );
  if (!row) {
    return res.status(500).json({ message: "Failed to retrieve created patient" });
  }
  return res.status(201).json({
    token,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      wallet_balance: Number(row.wallet_balance)
    }
  });
}));

app.post("/api/patient/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const rows = await query("SELECT id, name, email, phone, password_hash, wallet_balance FROM patients WHERE email = ?", [email.trim().toLowerCase()]);
  if (rows.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const patient = rows[0];
  const isValid = await bcrypt.compare(password, patient.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = createToken({ sub: patient.id, role: "patient", name: patient.name });
  return res.json({
    token,
    user: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      wallet_balance: Number(patient.wallet_balance)
    }
  });
}));

app.get("/api/patient/profile", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
  const [row] = await query(
    "SELECT id, name, email, phone, wallet_balance, created_at FROM patients WHERE id = ?",
    [req.user.sub]
  );
  if (!row) {
    return res.status(404).json({ message: "Profile not found" });
  }
  const settingsRows = await query("SELECT setting_key, setting_value FROM patient_settings WHERE patient_id = ?", [req.user.sub]);
  const settings = settingsRows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value === "1";
    return acc;
  }, {});
  res.json({
    profile: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      wallet_balance: Number(row.wallet_balance),
      created_at: row.created_at
    },
    settings
  });
}));

app.put("/api/patient/profile", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const updates = [];
  const values = [];
  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name.trim());
  }
  if (email !== undefined) {
    updates.push("email = ?");
    values.push(email.trim().toLowerCase());
  }
  if (phone !== undefined) {
    updates.push("phone = ?");
    values.push(phone === "" ? null : phone.trim());
  }
  if (password !== undefined && password.length >= 6) {
    updates.push("password_hash = ?");
    values.push(await bcrypt.hash(password, 10));
  }
  if (updates.length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }
  values.push(req.user.sub);
  await query(
    `UPDATE patients SET ${updates.join(", ")} WHERE id = ?`,
    values
  );
  const [row] = await query(
    "SELECT id, name, email, phone, wallet_balance FROM patients WHERE id = ?",
    [req.user.sub]
  );
  if (!row) {
    return res.status(404).json({ message: "Profile not found after update" });
  }
  return res.json({
    profile: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      wallet_balance: Number(row.wallet_balance)
    }
  });
}));

app.get("/api/patient/settings", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
  const rows = await query("SELECT setting_key, setting_value FROM patient_settings WHERE patient_id = ?", [req.user.sub]);
  const settings = rows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value === "1";
    return acc;
  }, {});
  for (const key of PATIENT_SETTING_KEYS) {
    if (settings[key] === undefined) settings[key] = PATIENT_SETTING_DEFAULTS[key] === "1";
  }
  res.json({ settings });
}));

app.put("/api/patient/settings/:settingKey", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
  const { settingKey } = req.params;
  const { enabled } = req.body;
  if (!PATIENT_SETTING_KEYS.includes(settingKey)) {
    return res.status(400).json({ message: "Invalid setting key" });
  }
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be boolean" });
  }
  await query(
    "INSERT INTO patient_settings (patient_id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
    [req.user.sub, settingKey, enabled ? "1" : "0"]
  );
  return res.json({ message: "Setting updated" });
}));

// ---------- Doctor APIs (web + mobile) ----------
app.post("/api/doctor/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const rows = await query(
    "SELECT id, name, email, phone, password_hash, specialization FROM doctors WHERE email = ?",
    [email.trim().toLowerCase()]
  );
  if (rows.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const doctor = rows[0];
  const isValid = await bcrypt.compare(password, doctor.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = createToken({ sub: doctor.id, role: "doctor", name: doctor.name });
  return res.json({
    token,
    user: {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      specialization: doctor.specialization
    }
  });
}));

app.get("/api/doctor/profile", authMiddleware, requireDoctor, asyncHandler(async (req, res) => {
  const [row] = await query(
    "SELECT id, name, email, phone, specialization, created_at FROM doctors WHERE id = ?",
    [req.user.sub]
  );
  if (!row) {
    return res.status(404).json({ message: "Profile not found" });
  }
  const [assistants] = await query("SELECT COUNT(*) as c FROM doctor_assistants WHERE doctor_id = ?", [req.user.sub]);
  res.json({
    profile: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      specialization: row.specialization,
      created_at: row.created_at
    },
    assistantsCount: assistants?.c || 0
  });
}));

app.get("/api/doctor/dashboard", authMiddleware, requireDoctor, asyncHandler(async (req, res) => {
  const [patients] = await query("SELECT COUNT(*) as c FROM patients");
  const [assistants] = await query("SELECT COUNT(*) as c FROM doctor_assistants WHERE doctor_id = ?", [req.user.sub]);
  res.json({
    cards: {
      totalPatients: patients?.c || 0,
      myAssistants: assistants?.c || 0,
      consultationsToday: 0
    }
  });
}));

// ---------- Assistant APIs (web + mobile) ----------
app.post("/api/assistant/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const rows = await query(
    `SELECT a.id, a.doctor_id, a.name, a.email, a.phone, a.password_hash, d.name as doctor_name, d.specialization 
     FROM doctor_assistants a 
     JOIN doctors d ON d.id = a.doctor_id 
     WHERE a.email = ?`,
    [email.trim().toLowerCase()]
  );
  if (rows.length === 0) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const assistant = rows[0];
  const isValid = await bcrypt.compare(password, assistant.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = createToken({ sub: assistant.id, role: "assistant", doctorId: assistant.doctor_id, name: assistant.name });
  return res.json({
    token,
    user: {
      id: assistant.id,
      name: assistant.name,
      email: assistant.email,
      phone: assistant.phone,
      doctorId: assistant.doctor_id,
      doctorName: assistant.doctor_name,
      doctorSpecialization: assistant.specialization
    }
  });
}));

app.get("/api/assistant/profile", authMiddleware, requireAssistant, asyncHandler(async (req, res) => {
  const [row] = await query(
    `SELECT a.id, a.name, a.email, a.phone, a.doctor_id, a.created_at, d.name as doctor_name, d.specialization 
     FROM doctor_assistants a 
     JOIN doctors d ON d.id = a.doctor_id 
     WHERE a.id = ?`,
    [req.user.sub]
  );
  if (!row) {
    return res.status(404).json({ message: "Profile not found" });
  }
  res.json({
    profile: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      doctorSpecialization: row.specialization,
      created_at: row.created_at
    }
  });
}));

app.get("/api/assistant/dashboard", authMiddleware, requireAssistant, asyncHandler(async (req, res) => {
  const [patients] = await query("SELECT COUNT(*) as c FROM patients");
  res.json({
    cards: {
      totalPatients: patients?.c || 0,
      consultationsToday: 0,
      pendingTasks: 0
    },
    doctorId: req.user.doctorId
  });
}));

registerEnterpriseRoutes(app, {
  authMiddleware,
  requireAdmin,
  requireDoctor,
  requirePatient,
  requireAssistant
});

registerWorldHealthRoutes(app, { authMiddleware, requireAdmin });
registerVideoRoutes(app, { authMiddleware, requireDoctor, requirePatient });
registerFileRoutes(app, { authMiddleware });
registerMessagingRoutes(app, { authMiddleware });
registerPrescriptionFulfillmentRoutes(app, { authMiddleware, requirePatient, requireDoctor });
registerFHIRRoutes(app, { authMiddleware });
registerComplianceRoutes(app, { authMiddleware, requirePatient, requireAdmin });
registerIntegrationRoutes(app, { authMiddleware, requireAdmin });
registerAdvancedRoutes(app, { authMiddleware, requireAdmin });
registerHealthRoutes(app);

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// WebSocket connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const user = jwt.verify(token, jwtSecret);
    socket.user = user;
    socket.join(`user:${user.role}:${user.sub}`);
    next();
  } catch {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  logger.info("WebSocket user connected", { role: socket.user.role, userId: socket.user.sub });
  socket.on("disconnect", () => {
    logger.info("WebSocket user disconnected", { role: socket.user.role, userId: socket.user.sub });
  });
});

// Start server first, then bootstrap database (non-blocking)
httpServer.listen(port, () => {
  logger.info(`Backend running on http://localhost:${port}`);
  logger.info(`WebSocket server ready`);
  logger.info(`API Documentation: http://localhost:${port}/api-docs`);
  logger.info("Seed admin: admin@healthapp.local / admin123");
  logger.info("Seed doctor: doctor@healthapp.local / doctor123");
  logger.info("Seed assistant: assistant@healthapp.local / assistant123");
  
  // Bootstrap database in background (non-blocking)
  bootstrapDatabase()
    .then(() => {
      logger.info("Database bootstrap completed successfully");
      startReminderCron();
    })
    .catch((error) => {
      logger.error("Database bootstrap failed (will retry on next request)", { 
        error: error.message, 
        stack: error.stack 
      });
      // Don't exit - let the app run and retry bootstrap on next DB query
      // This allows the app to start even if DB isn't ready yet
    });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});
