/** Global Business Ready - All 5 Phases: FHIR, Compliance, Scalability, Integrations, Advanced */
import { query } from "./db.js";

export async function bootstrapGlobalReadyTables() {
  // ========== PHASE 1: Interoperability ==========
  
  // FHIR Resources storage
  await query(`
    CREATE TABLE IF NOT EXISTS fhir_resources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(100) NOT NULL,
      fhir_version VARCHAR(10) DEFAULT 'R4',
      resource_json JSON NOT NULL,
      patient_id INT,
      organization_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_resource (resource_type, resource_id)
    )
  `);

  // Data transformation mappings
  await query(`
    CREATE TABLE IF NOT EXISTS data_transformations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_format VARCHAR(50) NOT NULL,
      target_format VARCHAR(50) NOT NULL,
      transformation_rules JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ICD-10 / SNOMED CT code mappings
  await query(`
    CREATE TABLE IF NOT EXISTS medical_code_mappings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code_system VARCHAR(50) NOT NULL,
      code VARCHAR(50) NOT NULL,
      display_name VARCHAR(255),
      mapped_to_system VARCHAR(50),
      mapped_code VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_code (code_system, code)
    )
  `);

  // Schema validation rules
  await query(`
    CREATE TABLE IF NOT EXISTS schema_validations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      schema_name VARCHAR(100) NOT NULL UNIQUE,
      schema_definition JSON NOT NULL,
      version VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========== PHASE 2: Compliance & Security ==========
  
  // Consent management
  await query(`
    CREATE TABLE IF NOT EXISTS patient_consents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      consent_type ENUM('data_sharing','research','marketing','cross_border') NOT NULL,
      granted_to_type VARCHAR(50),
      granted_to_id INT,
      granted TINYINT DEFAULT 1,
      expires_at TIMESTAMP NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Data anonymization records
  await query(`
    CREATE TABLE IF NOT EXISTS anonymized_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      original_entity_type VARCHAR(50) NOT NULL,
      original_entity_id INT NOT NULL,
      anonymized_id VARCHAR(100) NOT NULL UNIQUE,
      anonymization_method VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Encryption keys (for field-level encryption)
  await query(`
    CREATE TABLE IF NOT EXISTS encryption_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_id VARCHAR(100) NOT NULL UNIQUE,
      key_encrypted TEXT NOT NULL,
      algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      rotated_at TIMESTAMP NULL
    )
  `);

  // GDPR data subject requests
  await query(`
    CREATE TABLE IF NOT EXISTS gdpr_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      request_type ENUM('access','rectification','erasure','portability','restriction') NOT NULL,
      status ENUM('pending','processing','completed','rejected') DEFAULT 'pending',
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // ========== PHASE 3: Scalability ==========
  
  // Cache invalidation tracking
  await query(`
    CREATE TABLE IF NOT EXISTS cache_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cache_key VARCHAR(255) NOT NULL UNIQUE,
      entity_type VARCHAR(50),
      entity_id INT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // API rate limit tracking (backup to Redis)
  await query(`
    CREATE TABLE IF NOT EXISTS rate_limit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      ip_address VARCHAR(45),
      endpoint VARCHAR(255),
      request_count INT DEFAULT 1,
      window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_endpoint (user_id, endpoint, window_start)
    )
  `);

  // ========== PHASE 4: Real Integrations ==========
  
  // Integration connectors
  await query(`
    CREATE TABLE IF NOT EXISTS integration_connectors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      connector_type ENUM('epic','cerner','athenahealth','allscripts','labcorp','quest','surescripts','hl7','custom') NOT NULL,
      connector_name VARCHAR(100) NOT NULL,
      endpoint_url VARCHAR(500),
      api_key_encrypted TEXT,
      config JSON,
      status ENUM('active','inactive','error') DEFAULT 'active',
      last_sync_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Integration sync logs
  await query(`
    CREATE TABLE IF NOT EXISTS integration_sync_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      connector_id INT NOT NULL,
      sync_type ENUM('full','incremental','manual') DEFAULT 'incremental',
      records_synced INT DEFAULT 0,
      status ENUM('success','failed','partial') DEFAULT 'success',
      error_message TEXT,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (connector_id) REFERENCES integration_connectors(id)
    )
  `);

  // HL7 message queue
  await query(`
    CREATE TABLE IF NOT EXISTS hl7_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_type VARCHAR(20) NOT NULL,
      message_control_id VARCHAR(50) UNIQUE,
      raw_message TEXT NOT NULL,
      parsed_json JSON,
      source_system VARCHAR(100),
      destination_system VARCHAR(100),
      status ENUM('pending','processed','failed','retry') DEFAULT 'pending',
      processed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========== PHASE 5: Advanced Features ==========
  
  // Real-time event stream
  await query(`
    CREATE TABLE IF NOT EXISTS event_stream (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INT,
      event_data JSON,
      user_id INT,
      user_role VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_event_type (event_type, created_at),
      INDEX idx_entity (entity_type, entity_id)
    )
  `);

  // ML predictions / analytics
  await query(`
    CREATE TABLE IF NOT EXISTS ml_predictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      model_name VARCHAR(100) NOT NULL,
      patient_id INT,
      prediction_type ENUM('disease_risk','readmission','medication_adherence','outcome') NOT NULL,
      prediction_value DECIMAL(10,4),
      confidence DECIMAL(5,4),
      input_features JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Data quality checks
  await query(`
    CREATE TABLE IF NOT EXISTS data_quality_checks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      check_type ENUM('completeness','accuracy','consistency','timeliness','validity') NOT NULL,
      entity_type VARCHAR(50),
      entity_id INT,
      check_result ENUM('pass','fail','warning') NOT NULL,
      issues JSON,
      checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Predictive health models
  await query(`
    CREATE TABLE IF NOT EXISTS health_models (
      id INT AUTO_INCREMENT PRIMARY KEY,
      model_name VARCHAR(100) NOT NULL,
      model_type VARCHAR(50),
      model_version VARCHAR(20),
      model_data BLOB,
      accuracy_metrics JSON,
      trained_at TIMESTAMP NULL,
      deployed_at TIMESTAMP NULL,
      status ENUM('training','deployed','archived') DEFAULT 'training'
    )
  `);

  // Seed ICD-10 sample codes
  const icdRows = await query("SELECT COUNT(*) as c FROM medical_code_mappings WHERE code_system = 'ICD-10'");
  if (!icdRows[0]?.c || icdRows[0].c === 0) {
    const sampleCodes = [
      ["ICD-10", "A00", "Cholera", "SNOMED-CT", "61462000"],
      ["ICD-10", "E11", "Type 2 diabetes mellitus", "SNOMED-CT", "44054006"],
      ["ICD-10", "I10", "Essential hypertension", "SNOMED-CT", "38341003"],
      ["ICD-10", "J44", "Chronic obstructive pulmonary disease", "SNOMED-CT", "13645005"]
    ];
    for (const [system, code, display, mappedSystem, mappedCode] of sampleCodes) {
      await query(
        "INSERT INTO medical_code_mappings (code_system, code, display_name, mapped_to_system, mapped_code) VALUES (?, ?, ?, ?, ?)",
        [system, code, display, mappedSystem, mappedCode]
      );
    }
  }

  // Seed integration connectors
  const connectorRows = await query("SELECT COUNT(*) as c FROM integration_connectors");
  if (!connectorRows[0]?.c || connectorRows[0].c === 0) {
    await query(
      "INSERT INTO integration_connectors (connector_type, connector_name, status) VALUES (?, ?, ?)",
      ["epic", "Epic MyChart", "inactive"]
    );
    await query(
      "INSERT INTO integration_connectors (connector_type, connector_name, status) VALUES (?, ?, ?)",
      ["cerner", "Cerner PowerChart", "inactive"]
    );
    await query(
      "INSERT INTO integration_connectors (connector_type, connector_name, status) VALUES (?, ?, ?)",
      ["hl7", "HL7 FHIR Gateway", "active"]
    );
  }
}
