/** Real-time messaging with WebSocket */
import { query } from "../db.js";
import { asyncHandler } from "../utils/errorHandler.js";

export function registerMessagingRoutes(app, { authMiddleware }) {
  // Send message
  app.post("/api/messages", authMiddleware, asyncHandler(async (req, res) => {
    const { recipient_type, recipient_id, appointment_id, message_text } = req.body;
    if (!recipient_type || !recipient_id || !message_text) {
      return res.status(400).json({ message: "recipient_type, recipient_id, message_text required" });
    }

    const senderType = req.user.role === "admin" ? "admin" : req.user.role;
    const result = await query(
      "INSERT INTO messages (sender_type, sender_id, recipient_type, recipient_id, appointment_id, message_text) VALUES (?, ?, ?, ?, ?, ?)",
      [senderType, req.user.sub, recipient_type, recipient_id, appointment_id || null, message_text]
    );

    if (!result.insertId) {
      return res.status(500).json({ message: "Failed to send message" });
    }

    // Emit to WebSocket (handled in server.js)
    if (app.io) {
      app.io.to(`user:${recipient_type}:${recipient_id}`).emit("new_message", {
        id: result.insertId,
        sender_type: senderType,
        sender_id: req.user.sub,
        message_text,
        created_at: new Date()
      });
    }

    res.status(201).json({ id: result.insertId, message: "Message sent" });
  }));

  // Get messages (conversation)
  app.get("/api/messages", authMiddleware, asyncHandler(async (req, res) => {
    const { other_user_type, other_user_id, appointment_id } = req.query;
    const userType = req.user.role === "admin" ? "admin" : req.user.role;
    const userId = req.user.sub;

    let sql = `SELECT * FROM messages WHERE (
      (sender_type = ? AND sender_id = ? AND recipient_type = ? AND recipient_id = ?) OR
      (sender_type = ? AND sender_id = ? AND recipient_type = ? AND recipient_id = ?)
    )`;
    const params = [userType, userId, other_user_type, other_user_id, other_user_type, other_user_id, userType, userId];

    if (appointment_id) {
      sql += " AND appointment_id = ?";
      params.push(appointment_id);
    }

    sql += " ORDER BY created_at ASC LIMIT 100";

    const messages = await query(sql, params);
    res.json({ messages });
  }));

  // Mark message as read
  app.put("/api/messages/:id/read", authMiddleware, asyncHandler(async (req, res) => {
    const result = await query("UPDATE messages SET read_at = NOW() WHERE id = ? AND recipient_type = ? AND recipient_id = ?", [
      req.params.id,
      req.user.role === "admin" ? "admin" : req.user.role,
      req.user.sub
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Message not found or already read" });
    }
    res.json({ message: "Message marked as read" });
  }));

  // Get unread count
  app.get("/api/messages/unread-count", authMiddleware, asyncHandler(async (req, res) => {
    const userType = req.user.role === "admin" ? "admin" : req.user.role;
    const [result] = await query(
      "SELECT COUNT(*) as c FROM messages WHERE recipient_type = ? AND recipient_id = ? AND read_at IS NULL",
      [userType, req.user.sub]
    );
    res.json({ unread_count: result?.c || 0 });
  }));
}
