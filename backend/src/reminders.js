/** Automated reminders for appointments */
import cron from "node-cron";
import { query } from "./db.js";
import nodemailer from "nodemailer";
import twilio from "twilio";

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  }
});

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendEmailReminder(patientEmail, patientName, doctorName, appointmentTime) {
  if (!emailTransporter.options.auth.user) return false;
  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@healthapp.local",
      to: patientEmail,
      subject: "Appointment Reminder",
      html: `
        <h2>Appointment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a reminder that you have an appointment with <strong>${doctorName}</strong> on <strong>${new Date(appointmentTime).toLocaleString()}</strong>.</p>
        <p>Please join the video call 5 minutes before your scheduled time.</p>
      `
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

async function sendSMSReminder(phone, patientName, doctorName, appointmentTime) {
  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) return false;
  try {
    await twilioClient.messages.create({
      body: `Reminder: Appointment with ${doctorName} on ${new Date(appointmentTime).toLocaleString()}. Join 5 min early.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    return true;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}

export function startReminderCron() {
  // Run every hour, check appointments in next 24 hours
  cron.schedule("0 * * * *", async () => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const tomorrowStr = tomorrow.toISOString().slice(0, 19).replace("T", " ");

    const appointments = await query(
      `SELECT a.*, p.name as patient_name, p.email as patient_email, p.phone as patient_phone, d.name as doctor_name 
       FROM appointments a 
       JOIN patients p ON p.id = a.patient_id 
       JOIN doctors d ON d.id = a.doctor_id 
       WHERE a.status IN ('scheduled','confirmed') 
       AND a.slot_start BETWEEN NOW() AND ? 
       AND a.reminder_sent = 0`,
      [tomorrowStr]
    );

    for (const apt of appointments) {
      const hoursUntil = (new Date(apt.slot_start) - new Date()) / (1000 * 60 * 60);
      
      // Send reminder if appointment is in 24 hours (±1 hour window)
      if (hoursUntil >= 23 && hoursUntil <= 25) {
        let emailSent = false;
        let smsSent = false;

        if (apt.patient_email) {
          emailSent = await sendEmailReminder(apt.patient_email, apt.patient_name, apt.doctor_name, apt.slot_start);
        }

        if (apt.patient_phone) {
          smsSent = await sendSMSReminder(apt.patient_phone, apt.patient_name, apt.doctor_name, apt.slot_start);
        }

        await query("UPDATE appointments SET reminder_sent = 1 WHERE id = ?", [apt.id]);

        if (emailSent) {
          await query(
            "INSERT INTO reminder_logs (appointment_id, reminder_type, status) VALUES (?, ?, 'sent')",
            [apt.id, "email"]
          );
        }
        if (smsSent) {
          await query(
            "INSERT INTO reminder_logs (appointment_id, reminder_type, status) VALUES (?, ?, 'sent')",
            [apt.id, "sms"]
          );
        }
      }
    }
  });

  console.log("Reminder cron job started (runs every hour)");
}
