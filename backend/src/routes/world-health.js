/** World Health Portal - Stakeholder & Global Health APIs */
import { query } from "../db.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { asyncHandler } from "../utils/errorHandler.js";

const STAKEHOLDER_TABLES = {
  hospitals: "hospitals",
  medical_services: "medical_services",
  research_institutes: "research_institutes",
  pharmaceutical_companies: "pharmaceutical_companies",
  pharmacies: "pharmacies",
  health_equipment_shops: "health_equipment_shops",
  government_health_agencies: "government_health_agencies",
  government_health_ministries: "government_health_ministries"
};

export function registerWorldHealthRoutes(app, { authMiddleware, requireAdmin }) {
  // ---------- Global Health Conditions (Admin) ----------
  app.get("/api/world-health/global-conditions", authMiddleware, requireAdmin, cacheMiddleware(300), asyncHandler(async (req, res) => {
    const rows = await query(
      "SELECT region, country, disease_code, metric_name, SUM(metric_value) as total, metric_unit FROM global_health_conditions GROUP BY region, country, disease_code, metric_name, metric_unit ORDER BY region, country LIMIT 500"
    );
    const byRegion = {};
    for (const r of rows) {
      const key = `${r.region}|${r.country}`;
      if (!byRegion[key]) byRegion[key] = { region: r.region, country: r.country, metrics: [] };
      byRegion[key].metrics.push({
        disease_code: r.disease_code,
        metric_name: r.metric_name,
        value: Number(r.total),
        unit: r.metric_unit
      });
    }
    const conditions = Object.values(byRegion);
    const summary = {
      totalRegions: new Set(rows.map((r) => r.region)).size,
      totalCountries: new Set(rows.map((r) => r.country)).size,
      totalDataPoints: rows.length
    };
    res.json({ conditions, summary });
  }));

  app.post("/api/world-health/global-conditions", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { region, country, disease_code, metric_name, metric_value, metric_unit, report_date, source } = req.body;
    if (!region || !country || !metric_name || metric_value == null) {
      return res.status(400).json({ message: "region, country, metric_name, metric_value required" });
    }
    const date = report_date || new Date().toISOString().slice(0, 10);
    await query(
      "INSERT INTO global_health_conditions (region, country, disease_code, metric_name, metric_value, metric_unit, report_date, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [region, country, disease_code || null, metric_name, metric_value, metric_unit || null, date, source || null]
    );
    res.status(201).json({ message: "Health condition recorded" });
  }));

  // ---------- Stakeholder counts & list (Admin) ----------
  app.get("/api/world-health/stakeholders", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const counts = {};
    for (const [key, table] of Object.entries(STAKEHOLDER_TABLES)) {
      const [r] = await query(`SELECT COUNT(*) as c FROM ${table}`);
      counts[key] = r?.c || 0;
    }
    res.json({ counts });
  }));

  app.get("/api/world-health/stakeholders/:type", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { type } = req.params;
    const table = STAKEHOLDER_TABLES[type];
    if (!table) return res.status(400).json({ message: "Invalid stakeholder type" });
    const rows = await query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 200`);
    res.json({ stakeholders: rows });
  }));

  app.post("/api/world-health/stakeholders/:type", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { type } = req.params;
    const table = STAKEHOLDER_TABLES[type];
    if (!table) return res.status(400).json({ message: "Invalid stakeholder type" });
    const data = req.body;
    // Sanitize column names to prevent SQL injection - only allow alphanumeric and underscores
    const cols = Object.keys(data)
      .filter((k) => typeof data[k] !== "undefined")
      .filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)); // Valid SQL identifier pattern
    if (cols.length === 0) return res.status(400).json({ message: "No valid fields provided" });
    const vals = cols.map((c) => data[c]);
    const placeholders = cols.map(() => "?").join(", ");
    const colStr = cols.join(", ");
    await query(`INSERT INTO ${table} (${colStr}) VALUES (${placeholders})`, vals);
    res.status(201).json({ message: "Stakeholder created" });
  }));

  // ---------- Health Data Exchanges ----------
  app.get("/api/world-health/data-exchanges", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const rows = await query(
      "SELECT * FROM health_data_exchanges ORDER BY exchanged_at DESC LIMIT 200"
    );
    const summary = {
      totalExchanges: rows.length,
      byStatus: { success: 0, failed: 0, pending: 0 },
      byDataType: {}
    };
    for (const r of rows) {
      summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
      summary.byDataType[r.data_type] = (summary.byDataType[r.data_type] || 0) + 1;
    }
    res.json({ exchanges: rows, summary });
  }));

  app.post("/api/world-health/data-exchanges", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { from_stakeholder_type, from_stakeholder_id, to_stakeholder_type, to_stakeholder_id, data_type, summary, record_count } = req.body;
    if (!from_stakeholder_type || !from_stakeholder_id || !to_stakeholder_type || !to_stakeholder_id || !data_type) {
      return res.status(400).json({ message: "from/to stakeholder type, id, and data_type required" });
    }
    await query(
      "INSERT INTO health_data_exchanges (from_stakeholder_type, from_stakeholder_id, to_stakeholder_type, to_stakeholder_id, data_type, summary, record_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [from_stakeholder_type, from_stakeholder_id, to_stakeholder_type, to_stakeholder_id, data_type, summary || null, record_count || 0]
    );
    res.status(201).json({ message: "Data exchange recorded" });
  }));

  // ---------- Global dashboard (Admin) ----------
  app.get("/api/world-health/dashboard", authMiddleware, requireAdmin, cacheMiddleware(300), asyncHandler(async (req, res) => {
    const counts = {};
    for (const [key, table] of Object.entries(STAKEHOLDER_TABLES)) {
      const [r] = await query(`SELECT COUNT(*) as c FROM ${table}`);
      counts[key] = r?.c || 0;
    }
    const [exchanges] = await query("SELECT COUNT(*) as c FROM health_data_exchanges");
    const [conditions] = await query("SELECT COUNT(*) as c FROM global_health_conditions");
    const recentExchangesRows = await query(
      "SELECT * FROM health_data_exchanges ORDER BY exchanged_at DESC LIMIT 10"
    );
    res.json({
      stakeholders: counts,
      totalDataExchanges: exchanges?.c || 0,
      totalHealthDataPoints: conditions?.c || 0,
      recentExchanges: recentExchangesRows || []
    });
  }));
}
