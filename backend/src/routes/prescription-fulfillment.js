/** Prescription fulfillment workflow */
import { query } from "../db.js";
import { asyncHandler } from "../utils/errorHandler.js";

export function registerPrescriptionFulfillmentRoutes(app, { authMiddleware, requirePatient, requireDoctor }) {
  // Send prescription to pharmacy
  app.post("/api/prescriptions/:id/send-to-pharmacy", authMiddleware, requireDoctor, asyncHandler(async (req, res) => {
    const { pharmacy_id } = req.body;
    if (!pharmacy_id) return res.status(400).json({ message: "pharmacy_id required" });

    const [prescription] = await query("SELECT * FROM prescriptions WHERE id = ?", [req.params.id]);
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    await query(
      "INSERT INTO prescription_fulfillments (prescription_id, pharmacy_id, status, sent_at) VALUES (?, ?, 'sent', NOW())",
      [req.params.id, pharmacy_id]
    );

    res.json({ message: "Prescription sent to pharmacy" });
  }));

  // Request refill
  app.post("/api/prescriptions/:id/request-refill", authMiddleware, requirePatient, asyncHandler(async (req, res) => {
    const [prescription] = await query("SELECT * FROM prescriptions WHERE id = ? AND patient_id = ?", [
      req.params.id,
      req.user.sub
    ]);
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });
    if (prescription.refills <= 0) return res.status(400).json({ message: "No refills remaining" });

    await query(
      "INSERT INTO prescription_refill_requests (prescription_id, patient_id, status) VALUES (?, ?, 'pending')",
      [req.params.id, req.user.sub]
    );

    res.json({ message: "Refill request submitted" });
  }));

  // Approve/reject refill (doctor)
  app.put("/api/prescription-refills/:id", authMiddleware, requireDoctor, asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }

    const [refill] = await query("SELECT * FROM prescription_refill_requests WHERE id = ?", [req.params.id]);
    if (!refill) return res.status(404).json({ message: "Refill request not found" });

    await query("UPDATE prescription_refill_requests SET status = ?, processed_at = NOW() WHERE id = ?", [
      status,
      req.params.id
    ]);

    if (status === "approved") {
      await query("UPDATE prescriptions SET refills = refills - 1 WHERE id = ?", [refill.prescription_id]);
    }

    res.json({ message: `Refill ${status}` });
  }));

  // Get fulfillment status
  app.get("/api/prescriptions/:id/fulfillment", authMiddleware, asyncHandler(async (req, res) => {
    const fulfillments = await query(
      "SELECT * FROM prescription_fulfillments WHERE prescription_id = ? ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json({ fulfillments });
  }));

  // Get refill requests (doctor)
  app.get("/api/prescription-refills", authMiddleware, requireDoctor, asyncHandler(async (req, res) => {
    const requests = await query(
      `SELECT r.*, p.medication_name, pt.name as patient_name 
       FROM prescription_refill_requests r 
       JOIN prescriptions p ON p.id = r.prescription_id 
       JOIN patients pt ON pt.id = r.patient_id 
       WHERE p.doctor_id = ? 
       ORDER BY r.requested_at DESC`,
      [req.user.sub]
    );
    res.json({ requests });
  }));
}
