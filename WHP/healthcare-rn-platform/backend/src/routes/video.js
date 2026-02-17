/** Real video integration with Daily.co */
import { query } from "../db.js";
import logger from "../utils/logger.js";
import { asyncHandler } from "../utils/errorHandler.js";

const DAILY_API_KEY = process.env.DAILY_API_KEY || "";
let dailyClient = null;

// Lazy load Daily.co to avoid import errors if not configured
async function getDailyClient() {
  if (!DAILY_API_KEY) return null;
  if (dailyClient) return dailyClient;
  try {
    const Daily = (await import("@daily-co/daily-js/server")).default;
    dailyClient = Daily({ apiKey: DAILY_API_KEY });
    return dailyClient;
  } catch (error) {
    // Daily.co not available - will use fallback
    return null;
  }
}

export function registerVideoRoutes(app, { authMiddleware, requireDoctor, requirePatient }) {
  // Create Daily.co room for appointment
  app.post("/api/video/create-room", authMiddleware, asyncHandler(async (req, res) => {
    const { appointment_id } = req.body;
    if (!appointment_id) return res.status(400).json({ message: "appointment_id required" });

    const client = await getDailyClient();
    if (!client) {
      // Fallback: generate room ID without Daily.co
      const roomId = `room-${Math.random().toString(36).slice(2, 10)}`;
      await query(
        "INSERT INTO video_sessions (appointment_id, room_id, status) VALUES (?, ?, 'waiting')",
        [appointment_id, roomId]
      );
      return res.json({
        room_id: roomId,
        join_url: `/video/${roomId}`,
        daily_enabled: false
      });
    }

    try {
      const roomName = `appointment-${appointment_id}-${Date.now()}`;
      const room = await client.room.create({
        name: roomName,
        privacy: "private",
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          enable_recording: "cloud",
          exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
        }
      });

      const token = await client.meetingToken.create({
        properties: {
          room_name: room.name,
          is_owner: true
        }
      });

      await query(
        "INSERT INTO video_sessions (appointment_id, room_id, daily_room_url, daily_room_token, status) VALUES (?, ?, ?, ?, 'waiting')",
        [appointment_id, room.name, room.url, token.token]
      );

      res.json({
        room_id: room.name,
        room_url: room.url,
        token: token.token,
        daily_enabled: true
      });
    } catch (error) {
      logger.error("Daily.co error", { error: error.message, stack: error.stack });
      res.status(500).json({ message: "Failed to create video room", error: error.message });
    }
  }));

  // Get room token for joining
  app.post("/api/video/get-token", authMiddleware, asyncHandler(async (req, res) => {
    const { room_id } = req.body;
    if (!room_id) return res.status(400).json({ message: "room_id required" });

    const [session] = await query("SELECT * FROM video_sessions WHERE room_id = ?", [room_id]);
    if (!session) return res.status(404).json({ message: "Room not found" });

    const client = await getDailyClient();
    if (!client || !session.daily_room_url) {
      return res.json({ token: null, room_url: null, daily_enabled: false });
    }

    try {
      const isOwner = req.user.role === "doctor";
      const token = await client.meetingToken.create({
        properties: {
          room_name: room_id,
          is_owner: isOwner
        }
      });

      res.json({
        token: token.token,
        room_url: session.daily_room_url,
        daily_enabled: true
      });
    } catch (error) {
      logger.error("Failed to create token", { error: error.message });
      res.status(500).json({ message: "Failed to create token", error: error.message });
    }
  }));

  // End video session
  app.post("/api/video/end-session", authMiddleware, asyncHandler(async (req, res) => {
    const { room_id } = req.body;
    await query(
      "UPDATE video_sessions SET status = 'ended', ended_at = NOW() WHERE room_id = ?",
      [room_id]
    );
    res.json({ message: "Session ended" });
  }));
}
