/** World Health Portal - Stakeholder tables & health data exchange */
import { query } from "./db.js";

export async function bootstrapWorldHealthTables() {
  // Link doctors to hospitals
  try {
    await query("ALTER TABLE doctors ADD COLUMN hospital_id INT NULL");
  } catch (_) {}

  // 1. Hospitals
  await query(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(40) UNIQUE,
      type ENUM('general','specialty','teaching','clinic','other') DEFAULT 'general',
      country VARCHAR(80) NOT NULL,
      region VARCHAR(80),
      address TEXT,
      phone VARCHAR(40),
      email VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Medical Services (clinics, labs, imaging centers)
  await query(`
    CREATE TABLE IF NOT EXISTS medical_services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      type ENUM('clinic','lab','imaging','diagnostic','other') NOT NULL,
      country VARCHAR(80) NOT NULL,
      region VARCHAR(80),
      address TEXT,
      phone VARCHAR(40),
      email VARCHAR(120),
      hospital_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
    )
  `);

  // 3. Research Institutes
  await query(`
    CREATE TABLE IF NOT EXISTS research_institutes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      type ENUM('university','ngo','government','private','other') DEFAULT 'university',
      country VARCHAR(80) NOT NULL,
      region VARCHAR(80),
      focus_area VARCHAR(120),
      website VARCHAR(200),
      email VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Pharmaceutical Companies
  await query(`
    CREATE TABLE IF NOT EXISTS pharmaceutical_companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      country VARCHAR(80) NOT NULL,
      registration_number VARCHAR(60),
      contact_email VARCHAR(120),
      contact_phone VARCHAR(40),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Pharmacies (medicine shops)
  await query(`
    CREATE TABLE IF NOT EXISTS pharmacies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      country VARCHAR(80) NOT NULL,
      region VARCHAR(80),
      address TEXT,
      phone VARCHAR(40),
      license_number VARCHAR(60),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Health Equipment Shops
  await query(`
    CREATE TABLE IF NOT EXISTS health_equipment_shops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      country VARCHAR(80) NOT NULL,
      region VARCHAR(80),
      address TEXT,
      phone VARCHAR(40),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Government Health Agencies
  await query(`
    CREATE TABLE IF NOT EXISTS government_health_agencies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      country VARCHAR(80) NOT NULL,
      level ENUM('national','regional','local','international') DEFAULT 'national',
      mandate VARCHAR(255),
      contact_email VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Government Health Ministries
  await query(`
    CREATE TABLE IF NOT EXISTS government_health_ministries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      country VARCHAR(80) NOT NULL UNIQUE,
      minister_name VARCHAR(80),
      contact_email VARCHAR(120),
      website VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Health Data Exchanges (who exchanged what with whom)
  await query(`
    CREATE TABLE IF NOT EXISTS health_data_exchanges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      from_stakeholder_type VARCHAR(40) NOT NULL,
      from_stakeholder_id INT NOT NULL,
      to_stakeholder_type VARCHAR(40) NOT NULL,
      to_stakeholder_id INT NOT NULL,
      data_type ENUM('clinical','lab','prescription','epidemiology','drug_safety','supply_chain','research','regulatory','other') NOT NULL,
      summary VARCHAR(255),
      record_count INT DEFAULT 0,
      exchanged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('success','failed','pending') DEFAULT 'success'
    )
  `);

  // 10. Global Health Conditions (aggregated metrics)
  await query(`
    CREATE TABLE IF NOT EXISTS global_health_conditions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      region VARCHAR(80) NOT NULL,
      country VARCHAR(80) NOT NULL,
      disease_code VARCHAR(20),
      metric_name VARCHAR(80) NOT NULL,
      metric_value DECIMAL(12,2) NOT NULL,
      metric_unit VARCHAR(20),
      report_date DATE NOT NULL,
      source VARCHAR(80),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed sample global health data (only if empty)
  const [existing] = await query("SELECT COUNT(*) as c FROM global_health_conditions");
  if (!existing?.c || existing.c === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const seedMetrics = [
      ["Global", "World", "COVID-19", "active_cases", 0, "cases", today, "WHO"],
      ["Global", "World", "vaccination_coverage", "doses_administered", 0, "doses", today, "WHO"],
      ["Global", "World", "influenza", "weekly_cases", 0, "cases", today, "FluNet"],
      ["Asia", "Pakistan", "malaria", "monthly_cases", 0, "cases", today, "National"],
      ["Global", "World", "tb", "incidence_per_100k", 0, "per_100k", today, "WHO"]
    ];
    for (const [region, country, disease_code, metric_name, metric_value, metric_unit, report_date, source] of seedMetrics) {
      await query(
        "INSERT INTO global_health_conditions (region, country, disease_code, metric_name, metric_value, metric_unit, report_date, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [region, country, disease_code, metric_name, metric_value, metric_unit, report_date, source]
      );
    }
  }

  // Seed sample stakeholders
  const hospitalRows = await query("SELECT id FROM hospitals LIMIT 1");
  if (hospitalRows.length === 0) {
    await query(
      "INSERT INTO hospitals (name, code, type, country, region) VALUES (?, ?, ?, ?, ?)",
      ["City General Hospital", "CGH-001", "general", "Pakistan", "Punjab"]
    );
    await query(
      "INSERT INTO medical_services (name, type, country, region) VALUES (?, ?, ?, ?)",
      ["Central Lab", "lab", "Pakistan", "Punjab"]
    );
    await query(
      "INSERT INTO research_institutes (name, type, country, focus_area) VALUES (?, ?, ?, ?)",
      ["National Health Research Institute", "government", "Pakistan", "Public Health"]
    );
    await query(
      "INSERT INTO pharmaceutical_companies (name, country) VALUES (?, ?)",
      ["PharmaCorp Ltd", "Pakistan"]
    );
    await query(
      "INSERT INTO pharmacies (name, country, region) VALUES (?, ?, ?)",
      ["Care Pharmacy", "Pakistan", "Punjab"]
    );
    await query(
      "INSERT INTO health_equipment_shops (name, country, region) VALUES (?, ?, ?)",
      ["MedEquip Supplies", "Pakistan", "Punjab"]
    );
    await query(
      "INSERT INTO government_health_agencies (name, country, level) VALUES (?, ?, ?)",
      ["National Health Agency", "Pakistan", "national"]
    );
    await query(
      "INSERT INTO government_health_ministries (name, country) VALUES (?, ?)",
      ["Ministry of Health", "Pakistan"]
    );
  }
}
