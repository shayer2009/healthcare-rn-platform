/** Enhanced telemedicine features - file uploads, messaging, reminders, prescription fulfillment */
import { query } from "./db.js";

export async function bootstrapEnhancementTables() {
  // File uploads
  await query(`
    CREATE TABLE IF NOT EXISTS file_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type ENUM('prescription','lab_report','clinical_note','appointment','other') NOT NULL,
      entity_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size INT,
      mime_type VARCHAR(100),
      uploaded_by INT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Real-time messaging
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_type ENUM('patient','doctor','assistant','admin') NOT NULL,
      sender_id INT NOT NULL,
      recipient_type ENUM('patient','doctor','assistant','admin') NOT NULL,
      recipient_id INT NOT NULL,
      appointment_id INT,
      message_text TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recipient (recipient_type, recipient_id),
      INDEX idx_sender (sender_type, sender_id)
    )
  `);

  // Prescription fulfillment
  await query(`
    CREATE TABLE IF NOT EXISTS prescription_fulfillments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prescription_id INT NOT NULL,
      pharmacy_id INT,
      status ENUM('pending','sent','dispensed','cancelled') DEFAULT 'pending',
      sent_at TIMESTAMP NULL,
      dispensed_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
    )
  `);

  // Prescription refill requests
  await query(`
    CREATE TABLE IF NOT EXISTS prescription_refill_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prescription_id INT NOT NULL,
      patient_id INT NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Update video_sessions to include Daily.co room URL
  try {
    await query("ALTER TABLE video_sessions ADD COLUMN daily_room_url VARCHAR(500) NULL");
    await query("ALTER TABLE video_sessions ADD COLUMN daily_room_token VARCHAR(500) NULL");
  } catch (_) {}

  // Reminder logs
  await query(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT NOT NULL,
      reminder_type ENUM('email','sms','push') NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('sent','failed') DEFAULT 'sent',
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
  `);
}
