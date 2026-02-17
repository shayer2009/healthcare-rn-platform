/** Phase 5: Advanced Features - ML, Analytics, Real-time Streaming */
import { query } from "../db.js";
import { asyncHandler } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

let kafkaClient = null;
let kafkaProducer = null;

// Lazy load Kafka
async function getKafkaProducer() {
  if (!process.env.KAFKA_BROKERS) return null;
  if (kafkaProducer) return kafkaProducer;
  try {
    const { Kafka } = await import("kafkajs");
    kafkaClient = new Kafka({
      clientId: "world-health-portal",
      brokers: process.env.KAFKA_BROKERS.split(",").map((b) => b.trim()).filter(Boolean)
    });
    kafkaProducer = kafkaClient.producer();
    await kafkaProducer.connect();
    return kafkaProducer;
  } catch (e) {
    logger.warn("Kafka not available", { error: e.message });
    return null;
  }
}

export function registerAdvancedRoutes(app, { authMiddleware, requireAdmin }) {
  // Emit event to stream
  async function emitEvent(eventType, entityType, entityId, eventData, userId, userRole) {
    // Store in database
    await query(
      "INSERT INTO event_stream (event_type, entity_type, entity_id, event_data, user_id, user_role) VALUES (?, ?, ?, ?, ?, ?)",
      [eventType, entityType, entityId, JSON.stringify(eventData), userId, userRole]
    );

    // Emit to Kafka if available
    const producer = await getKafkaProducer();
    if (producer) {
      try {
        await producer.send({
          topic: "health-events",
          messages: [{ value: JSON.stringify({ eventType, entityType, entityId, eventData, timestamp: new Date() })}]
        });
      } catch (e) {}
    }

    // Emit to WebSocket
    if (app.io) {
      app.io.emit("health_event", { eventType, entityType, entityId, eventData });
    }
  }

  // Get event stream
  app.get("/api/advanced/events", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { event_type, entity_type, limit = 100 } = req.query;
    let sql = "SELECT * FROM event_stream WHERE 1=1";
    const params = [];
    if (event_type) { sql += " AND event_type = ?"; params.push(event_type); }
    if (entity_type) { sql += " AND entity_type = ?"; params.push(entity_type); }
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(Number(limit));
    const events = await query(sql, params);
    res.json({ events });
  }));

  // ML Prediction endpoint
  app.post("/api/advanced/ml/predict", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { model_name, patient_id, input_features } = req.body;
    
    // Placeholder: In production, this would call ML model service
    const prediction = {
      prediction_type: "disease_risk",
      prediction_value: Math.random() * 0.5, // Placeholder
      confidence: 0.75 + Math.random() * 0.2
    };

    await query(
      "INSERT INTO ml_predictions (model_name, patient_id, prediction_type, prediction_value, confidence, input_features) VALUES (?, ?, ?, ?, ?, ?)",
      [model_name || "default", patient_id, prediction.prediction_type, prediction.prediction_value, prediction.confidence, JSON.stringify(input_features || {})]
    );

    res.json({ prediction });
  }));

  // Get predictions for patient
  app.get("/api/advanced/ml/predictions/:patientId", authMiddleware, asyncHandler(async (req, res) => {
    const predictions = await query(
      "SELECT * FROM ml_predictions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.params.patientId]
    );
    res.json({ predictions });
  }));

  // Data quality check
  app.post("/api/advanced/data-quality/check", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { entity_type, entity_id } = req.body;
    
    // Placeholder: Run quality checks
    const issues = [];
    const result = issues.length === 0 ? "pass" : "warning";
    
    await query(
      "INSERT INTO data_quality_checks (check_type, entity_type, entity_id, check_result, issues) VALUES (?, ?, ?, ?, ?)",
      ["completeness", entity_type, entity_id, result, JSON.stringify(issues)]
    );

    res.json({ check_result: result, issues });
  }));

  // Get quality check results
  app.get("/api/advanced/data-quality/results", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { entity_type, check_result } = req.query;
    let sql = "SELECT * FROM data_quality_checks WHERE 1=1";
    const params = [];
    if (entity_type) { sql += " AND entity_type = ?"; params.push(entity_type); }
    if (check_result) { sql += " AND check_result = ?"; params.push(check_result); }
    sql += " ORDER BY checked_at DESC LIMIT 200";
    const results = await query(sql, params);
    res.json({ results });
  }));

  // Health model management
  app.get("/api/advanced/models", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const models = await query("SELECT id, model_name, model_type, model_version, status, trained_at, deployed_at FROM health_models");
    res.json({ models });
  }));

  app.post("/api/advanced/models", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const { model_name, model_type, model_version } = req.body;
    await query(
      "INSERT INTO health_models (model_name, model_type, model_version, status) VALUES (?, ?, ?, 'training')",
      [model_name, model_type, model_version || "1.0"]
    );
    res.status(201).json({ message: "Model created" });
  }));

  // Real-time analytics dashboard
  app.get("/api/advanced/analytics/realtime", authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
    const [eventsLastHour] = await query(
      "SELECT COUNT(*) as c FROM event_stream WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    );
    const [dataExchangesLastHour] = await query(
      "SELECT COUNT(*) as c FROM health_data_exchanges WHERE exchanged_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    );
    const [activeUsers] = await query(
      "SELECT COUNT(DISTINCT user_id) as c FROM audit_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    );
    
    res.json({
      events_last_hour: eventsLastHour?.c || 0,
      data_exchanges_last_hour: dataExchangesLastHour?.c || 0,
      active_users_last_hour: activeUsers?.c || 0,
      timestamp: new Date()
    });
  }));

  // Export emitEvent for use in other routes
  app.emitEvent = emitEvent;
}
