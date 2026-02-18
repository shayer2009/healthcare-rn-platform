/** Phase 1: HL7 FHIR API Implementation */
import { query } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { asyncHandler, AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

export function registerFHIRRoutes(app, { authMiddleware }) {
  // FHIR Base URL: /fhir/
  
  // Get FHIR resource
  app.get("/fhir/:resourceType/:id", authMiddleware, asyncHandler(async (req, res) => {
    const { resourceType, id } = req.params;
    const [resource] = await query(
      "SELECT resource_json FROM fhir_resources WHERE resource_type = ? AND resource_id = ?",
      [resourceType, id]
    );
    if (!resource) {
      return res.status(404).json({ resourceType, id, issue: [{ severity: "error", code: "not-found" }] });
    }
    try {
      res.json({ ...JSON.parse(resource.resource_json), resourceType });
    } catch (error) {
      logger.error("Failed to parse FHIR resource", { error: error.message });
      throw new AppError("Invalid FHIR resource format", 500);
    }
  }));

  // Search FHIR resources
  app.get("/fhir/:resourceType", authMiddleware, asyncHandler(async (req, res) => {
    const { resourceType } = req.params;
    const { patient, _count = 10 } = req.query;
    let sql = "SELECT resource_json FROM fhir_resources WHERE resource_type = ?";
    const params = [resourceType];
    if (patient) {
      sql += " AND JSON_EXTRACT(resource_json, '$.subject.reference') LIKE ?";
      params.push(`%Patient/${patient}%`);
    }
    sql += " LIMIT ?";
    params.push(Number(_count));
    const rows = await query(sql, params);
    const entries = rows.map((r) => {
      try {
        const parsed = JSON.parse(r.resource_json);
        return {
          resource: parsed,
          fullUrl: `/fhir/${resourceType}/${parsed.id}`
        };
      } catch (error) {
        logger.warn("Failed to parse FHIR resource in search", { error: error.message });
        return null;
      }
    }).filter(Boolean);
    
    res.json({
      resourceType,
      type: "searchset",
      total: entries.length,
      entry: entries
    });
  }));

  // Create/Update FHIR resource
  app.post("/fhir/:resourceType", authMiddleware, asyncHandler(async (req, res) => {
    const { resourceType } = req.params;
    const resource = req.body;
    if (!resource.id) resource.id = uuidv4();
    resource.resourceType = resourceType;
    const resourceId = resource.id;
    await query(
      "INSERT INTO fhir_resources (resource_type, resource_id, resource_json, patient_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE resource_json = VALUES(resource_json), updated_at = NOW()",
      [resourceType, resourceId, JSON.stringify(resource), resource.subject?.reference?.match(/Patient\/(\d+)/)?.[1] || null]
    );
    res.status(201).json({ ...resource, resourceType });
  }));

  // Transform to FHIR
  app.post("/api/fhir/transform", authMiddleware, asyncHandler(async (req, res) => {
    const { source_format, source_data, target_format } = req.body;
    if (target_format !== "FHIR-R4") return res.status(400).json({ message: "Only FHIR-R4 supported" });
    if (!source_data || typeof source_data !== "object") {
      return res.status(400).json({ message: "source_data is required and must be an object" });
    }

    // Simple transformation example (Patient to FHIR Patient)
    if (source_format === "internal" && source_data.type === "patient") {
      const nameParts = (source_data.name || "").toString().trim().split(/\s+/);
      const family = nameParts[0] || "";
      const given = nameParts.slice(1).join(" ") || "";
      const fhirPatient = {
        resourceType: "Patient",
        id: `patient-${source_data.id}`,
        identifier: [{ system: "http://hospital.example.org/patients", value: String(source_data.id) }],
        name: [{ family, given: given ? [given] : [] }],
        telecom: [
          ...(source_data.email ? [{ system: "email", value: source_data.email }] : []),
          ...(source_data.phone ? [{ system: "phone", value: source_data.phone }] : [])
        ],
        gender: source_data.gender || "unknown"
      };
      res.json({ fhir_resource: fhirPatient });
    } else {
      res.status(400).json({ message: "Unsupported transformation" });
    }
  }));

  // Map medical codes (ICD-10 to SNOMED CT)
  app.get("/api/fhir/code-mapping", authMiddleware, asyncHandler(async (req, res) => {
    const { code_system, code, target_system } = req.query;
    const rows = await query(
      "SELECT * FROM medical_code_mappings WHERE code_system = ? AND code = ? AND mapped_to_system = ?",
      [code_system, code, target_system]
    );
    res.json({ mappings: rows });
  }));
}
