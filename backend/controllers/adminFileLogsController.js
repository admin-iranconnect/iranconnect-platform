// backend/controllers/adminFileLogsController.js
import db from "../db.js";

/**
 * 📜 دریافت لیست لاگ‌های آپلود فایل
 */
export async function getFileLogs(req, res) {
  try {
    const { status, source } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`scan_status = $${params.length}`);
    }

    if (source) {
      params.push(`%${source}%`);
      conditions.push(`upload_source ILIKE $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        f.id,
        f.file_name,
        f.mime_type,
        f.file_size,
        f.scan_status,
        f.upload_source,
        f.scanned_at,
        u.email AS user_email
      FROM file_scan_logs f
      LEFT JOIN users u ON f.user_id = u.id
      ${whereClause}
      ORDER BY f.scanned_at DESC
      LIMIT 200
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ getFileLogs error:", err);
    res.status(500).json({ error: "Failed to fetch file logs." });
  }
}
