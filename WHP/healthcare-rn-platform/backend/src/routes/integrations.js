/** Phase 4: Real Integration Connectors */
import { query } from "../db.js";
import { asyncHandler } from "../utils/errorHandler.js";

export function registerIntegrationRoutes(app, { authMiddleware, requireAdmin }) {
  // List connectors
  app.get("/api/integrations/connectors", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const connectors = await query("SELECT id, connector_type, connector_name, status, last_sync_at FROM integration_connectors");
    res.json({ connectors });
  }));

  // Configure connector
  app.put("/api/integrations/connectors/:id", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { endpoint_url, config, status } = req.body;
    const result = await query(
      "UPDATE integration_connectors SET endpoint_url = ?, config = ?, status = ? WHERE id = ?",
      [endpoint_url || null, JSON.stringify(config || {}), status || "active", req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Connector not found" });
    }
    res.json({ message: "Connector updated" });
  }));

  // Sync with Epic (placeholder - requires Epic OAuth2 setup)
  app.post("/api/integrations/epic/sync", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const [connector] = await query("SELECT * FROM integration_connectors WHERE connector_type = 'epic' AND status = 'active' LIMIT 1");
    if (!connector) return res.status(400).json({ message: "Epic connector not configured" });

    await query(
      "INSERT INTO integration_sync_logs (connector_id, sync_type, status, started_at) VALUES (?, ?, ?, NOW())",
      [connector.id, "manual", "pending"]
    );

    // Placeholder: In production, this would call Epic FHIR API
    res.json({ message: "Epic sync initiated (check logs)", note: "Requires Epic OAuth2 credentials" });
  }));

  // Sync with Cerner (placeholder)
  app.post("/api/integrations/cerner/sync", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const [connector] = await query("SELECT * FROM integration_connectors WHERE connector_type = 'cerner' AND status = 'active' LIMIT 1");
    if (!connector) return res.status(400).json({ message: "Cerner connector not configured" });
    res.json({ message: "Cerner sync initiated (check logs)", note: "Requires Cerner OAuth2 credentials" });
  }));

  // HL7 message processing
  app.post("/api/integrations/hl7/process", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { raw_message, message_type, source_system, destination_system } = req.body;
    const messageControlId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    await query(
      "INSERT INTO hl7_messages (message_type, message_control_id, raw_message, source_system, destination_system, status) VALUES (?, ?, ?, ?, ?, 'pending')",
      [message_type || "ADT", messageControlId, raw_message, source_system || "unknown", destination_system || "unknown"]
    );

    // Placeholder: Parse HL7 message (would use hl7-parser library in production)
    res.json({ message_control_id: messageControlId, status: "queued" });
  }));

  // Get sync logs
  app.get("/api/integrations/sync-logs", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const logs = await query(
      "SELECT l.*, c.connector_name FROM integration_sync_logs l JOIN integration_connectors c ON c.id = l.connector_id ORDER BY l.started_at DESC LIMIT 100"
    );
    res.json({ logs });
  }));
}
