/** File uploads for prescriptions, lab reports, images */
import { query } from "../db.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname, join, basename } from "path";
import { existsSync, mkdirSync } from "fs";
import logger from "../utils/logger.js";
import { asyncHandler, AppError } from "../utils/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let uploadsDir;
try {
  uploadsDir = join(__dirname, "../../uploads");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
} catch (_) {
  uploadsDir = join(process.cwd(), "uploads");
  try {
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  } catch (_) {
    uploadsDir = null; // will use memoryStorage
  }
}

const storage = uploadsDir
  ? multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => {
        const name = file.originalname && String(file.originalname).trim();
        const ext = (name && name.includes(".") ? name.split(".").pop() : null) || "bin";
        cb(null, `${uuidv4()}.${ext}`);
      }
    })
  : multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} not allowed. Allowed types: ${allowed.join(", ")}`, 400));
    }
  }
});

export function registerFileRoutes(app, { authMiddleware }) {
  // Upload file
  app.post("/api/files/upload", authMiddleware, upload.single("file"), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { entity_type, entity_id } = req.body;
    if (!entity_type || !entity_id) {
      return res.status(400).json({ message: "entity_type and entity_id required" });
    }

    const filePath = req.file.filename ? `/uploads/${req.file.filename}` : `memory:${uuidv4()}`;
    const result = await query(
      "INSERT INTO file_attachments (entity_type, entity_id, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        entity_type,
        entity_id,
        req.file.originalname || "upload",
        filePath,
        req.file.size,
        req.file.mimetype,
        req.user.sub
      ]
    );

    if (!result.insertId) {
      return res.status(500).json({ message: "Failed to save file record" });
    }

    res.status(201).json({
      id: result.insertId,
      file_name: req.file.originalname || "upload",
      file_path,
      file_size: req.file.size
    });
  }));

  // Get files for entity
  app.get("/api/files/:entity_type/:entity_id", authMiddleware, asyncHandler(async (req, res) => {
    const { entity_type, entity_id } = req.params;
    const files = await query(
      "SELECT * FROM file_attachments WHERE entity_type = ? AND entity_id = ? ORDER BY uploaded_at DESC",
      [entity_type, entity_id]
    );
    res.json({ files });
  }));

  // Serve uploaded files (only when disk storage is available)
  if (uploadsDir) {
    app.get("/uploads/:filename", asyncHandler(async (req, res) => {
      const filename = basename(req.params.filename);
      if (!filename) return res.status(400).json({ message: "Invalid filename" });
      const filePath = join(uploadsDir, filename);
      if (!existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      res.sendFile(filePath);
    }));
  }
}
