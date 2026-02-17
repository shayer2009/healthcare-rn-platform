/** Enterprise telehealth tables - all 13 features */
import { query } from "./db.js";

export async function bootstrapEnterpriseTables() {
  // 13. Multi-tenancy: organizations (optional tenant)
  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      settings JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add org_id when multitenancy is on (run once; ignore if column exists)
  try {
    await query("ALTER TABLE doctors ADD COLUMN org_id INT NULL");
  } catch (_) {}
  try {
    await query("ALTER TABLE patients ADD COLUMN org_id INT NULL");
  } catch (_) {}

  // 2. Scheduling & Appointments
  await query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      slot_start TIMESTAMP NOT NULL,
      slot_end TIMESTAMP NOT NULL,
      status ENUM('scheduled','confirmed','completed','cancelled','no_show') DEFAULT 'scheduled',
      notes TEXT,
      reminder_sent TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS doctor_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_id INT NOT NULL,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // 1. Video Consultations
  await query(`
    CREATE TABLE IF NOT EXISTS video_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT,
      room_id VARCHAR(64) NOT NULL UNIQUE,
      status ENUM('waiting','active','ended') DEFAULT 'waiting',
      recording_enabled TINYINT DEFAULT 0,
      started_at TIMESTAMP NULL,
      ended_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  // 3. Audit logs (Security & Compliance)
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      user_role VARCHAR(20),
      action VARCHAR(80) NOT NULL,
      resource VARCHAR(80),
      resource_id INT,
      details JSON,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS mfa_secrets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_type ENUM('admin','patient','doctor','assistant') NOT NULL,
      user_id INT NOT NULL,
      secret VARCHAR(255) NOT NULL,
      enabled TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Clinical & Medical Records
  await query(`
    CREATE TABLE IF NOT EXISTS clinical_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      appointment_id INT,
      note_type ENUM('soap','progress','discharge') DEFAULT 'soap',
      subjective TEXT,
      objective TEXT,
      assessment TEXT,
      plan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS patient_vitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      recorded_by INT,
      bp_systolic INT,
      bp_diastolic INT,
      heart_rate INT,
      temperature DECIMAL(4,1),
      weight DECIMAL(5,2),
      blood_glucose INT,
      notes TEXT,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS patient_allergies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      allergy_name VARCHAR(120) NOT NULL,
      severity ENUM('mild','moderate','severe'),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // 5. E-Prescribing
  await query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      appointment_id INT,
      medication_name VARCHAR(120) NOT NULL,
      dosage VARCHAR(80),
      frequency VARCHAR(80),
      duration_days INT,
      refills INT DEFAULT 0,
      instructions TEXT,
      status ENUM('active','completed','cancelled') DEFAULT 'active',
      prescribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // 6. Payments & Billing
  await query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'PKR',
      status ENUM('pending','paid','cancelled') DEFAULT 'pending',
      due_date DATE,
      paid_at TIMESTAMP NULL,
      payment_method VARCHAR(40),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS insurance_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      provider_name VARCHAR(80),
      policy_number VARCHAR(60),
      group_number VARCHAR(60),
      verified TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // 7. Notifications
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_type VARCHAR(20) NOT NULL,
      user_id INT NOT NULL,
      channel ENUM('push','sms','email','in_app') NOT NULL,
      title VARCHAR(120),
      body TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      sent_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      template_key VARCHAR(80) NOT NULL UNIQUE,
      channel ENUM('push','sms','email') NOT NULL,
      subject VARCHAR(120),
      body_template TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Patient Portal - Pre-visit forms
  await query(`
    CREATE TABLE IF NOT EXISTS intake_forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      appointment_id INT,
      form_data JSON NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // 9. Provider availability (doctor_availability already created)
  await query(`
    CREATE TABLE IF NOT EXISTS provider_queue (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_id INT NOT NULL,
      appointment_id INT NOT NULL,
      queue_position INT NOT NULL,
      status ENUM('waiting','in_room','done') DEFAULT 'waiting',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);

  // 10. Analytics - stored aggregations (optional; can compute on-the-fly)
  await query(`
    CREATE TABLE IF NOT EXISTS analytics_daily (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL,
      metric_key VARCHAR(60) NOT NULL,
      metric_value DECIMAL(12,2) NOT NULL,
      dimensions JSON,
      UNIQUE KEY uk_date_metric (date, metric_key)
    )
  `);

  // 11. Integrations
  await query(`
    CREATE TABLE IF NOT EXISTS integrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      integration_type VARCHAR(40) NOT NULL,
      config JSON,
      webhook_url VARCHAR(255),
      api_key_encrypted VARCHAR(255),
      enabled TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_hash VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(80),
      permissions JSON,
      last_used_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 12. Infrastructure - rate limit tracking (in-memory or Redis in prod)
  // System status stored in app_settings

  // Enterprise feature settings (add to app_settings)
  const enterpriseSettings = [
    ["multitenancy_enabled", "0"],
    ["video_enabled", "1"],
    ["scheduling_enabled", "1"],
    ["mfa_enabled", "0"],
    ["ehr_enabled", "1"],
    ["eprescribing_enabled", "1"],
    ["payments_enabled", "1"],
    ["notifications_enabled", "1"],
    ["intake_forms_enabled", "1"],
    ["analytics_enabled", "1"],
    ["integrations_enabled", "1"],
    ["audit_logging_enabled", "1"]
  ];

  for (const [key, value] of enterpriseSettings) {
    await query(
      "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)",
      [key, value]
    );
  }
}
