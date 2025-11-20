//backend/routes/admin_fileLogs.js
import express from "express";
import { getFileLogs } from "../controllers/adminFileLogsController.js";
import { exportFileLogsPDF, exportFileLogsXLSX } from "../controllers/adminFileLogsExportController.js";
import jwt from "jsonwebtoken";
import db from "../db.js";


const router = express.Router();

/* ==========================
   🔐 Middleware: Admin or SuperAdmin Auth
   ========================== */
async function verifyAdmin(req, res, next) {
  try {
    let token;

    // ✅ بررسی توکن در Header یا Query (برای window.open در PDF/XLSX)
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      "SELECT role, is_blocked FROM users WHERE id = $1",
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const { role, is_blocked } = result.rows[0];

    if (is_blocked) {
      return res
        .status(423)
        .json({ error: "Account locked. Contact administrator." });
    }

    if (role !== "admin" && role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "Admin or Super Admin access required" });
    }

    req.user = { id: decoded.id, role };
    next();
  } catch (err) {
    console.error("❌ verifyAdmin error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* ==========================
   📜 Routes
   ========================== */
router.get("/", verifyAdmin, getFileLogs);
router.get("/export/xlsx", verifyAdmin, exportFileLogsXLSX);
router.get("/export/pdf", verifyAdmin, exportFileLogsPDF);

/**
 * 📜 GET /api/admin/files/logs
 * مشاهده لاگ فایل‌ها با فیلتر اختیاری
 */
router.get("/logs", verifyAdmin, async (req, res) => {
  try {
    const { status, source, limit = 100 } = req.query;

    const conditions = [];
    const values = [];
    let where = "";

    if (status) {
      values.push(status);
      conditions.push(`f.scan_status = $${values.length}`);
    }

    if (source) {
      values.push(`%${source.toLowerCase()}%`);
      conditions.push(`LOWER(f.upload_source) LIKE $${values.length}`);
    }

    if (conditions.length) {
      where = `WHERE ${conditions.join(" AND ")}`;
    }

    const query = `
      SELECT 
        f.id, f.file_name, f.mime_type, f.file_size, f.scan_status,
        f.upload_source, f.ip_address, f.scanned_at, u.email AS user_email
      FROM file_scan_logs f
      LEFT JOIN users u ON u.id = f.user_id
      ${where}
      ORDER BY f.scanned_at DESC
      LIMIT $${values.length + 1};
    `;

    values.push(limit);
    const { rows } = await db.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching file logs:", err);
    res.status(500).json({ error: "Server error" });
  }
});



export default router;
