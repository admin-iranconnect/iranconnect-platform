//backend/controllers/adminBusinessRequestsController.js
import db from "../db.js";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ───────────── 📋 لیست تمام درخواست‌ها ───────────── */
export async function listRequests(req, res) {
  try {
    const { type, status, q } = req.query;
    const params = [];

    let where = `WHERE br.request_type IN ('new','update','delete')`;

    if (type) {
      params.push(type);
      where += ` AND br.request_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND br.status = $${params.length}`;
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where += ` AND (LOWER(b.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    const query = `
      SELECT br.*, 
             u.email AS user_email,
             b.name  AS business_name
      FROM business_requests br
      LEFT JOIN users u ON u.id = br.user_id
      LEFT JOIN businesses b ON b.id = br.business_id
      ${where}
      ORDER BY br.created_at DESC
      LIMIT 200
    `;

    const { rows } = await db.query(query, params);
    res.json({ rows, total: rows.length });
  } catch (err) {
    console.error("❌ listRequests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 📄 جزئیات درخواست ───────────── */
export async function getRequestDetails(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
      SELECT 
        br.*, 
        u.email AS user_email, 
        b.name AS business_name,
        a.email AS admin_email
      FROM business_requests br
      LEFT JOIN users u ON u.id = br.user_id
      LEFT JOIN businesses b ON b.id = br.business_id
      LEFT JOIN users a ON a.id = br.processed_by
      WHERE br.id = $1
        AND br.request_type IN ('new','update','delete')
      `,
      [id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Request not found" });

    const reqData = result.rows[0];
    try {
      reqData.payload = JSON.parse(reqData.payload || "{}");
    } catch {
      reqData.payload = {};
    }

    try {
      reqData.attachments = JSON.parse(reqData.attachments || "[]");
    } catch {
      reqData.attachments = [];
    }

    res.json(reqData);
  } catch (err) {
    console.error("❌ getRequestDetails error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── ✅/❌ تغییر وضعیت ───────────── */
export async function updateRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const validStatuses = ["approved", "rejected"];

    if (!validStatuses.includes(status))
      return res.status(400).json({ error: "Invalid status value" });

    if (!admin_note || !admin_note.trim())
      return res.status(400).json({ error: "Admin note is required" });

    const query = `
      UPDATE business_requests
      SET status = $1,
          admin_note = $2,
          processed_at = NOW(),
          processed_by = $3
      WHERE id = $4
        AND request_type IN ('new','update','delete')
      RETURNING *;
    `;
    const values = [status, admin_note.trim(), req.user.id, id];
    const { rowCount, rows } = await db.query(query, values);

    if (!rowCount)
      return res.status(404).json({ error: "Request not found or not applicable" });

    res.json({
      success: true,
      message: "Request updated successfully",
      request: rows[0],
    });
  } catch (err) {
    console.error("❌ updateRequestStatus error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 💾 دانلود داده‌ها ───────────── */
export async function downloadRequestData(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      "SELECT payload, attachments, ticket_code FROM business_requests WHERE id=$1",
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Request not found" });

    const record = rows[0];
    console.log("🧩 Attachments raw from DB:", record.attachments);

    const tmpDir = path.join(__dirname, "../tmp", `request_${record.ticket_code}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    // 🧾 تبدیل payload به متن خوانا
    let textContent = "";
    try {
      const parsed = JSON.parse(record.payload || "{}");
      textContent = Object.entries(parsed)
        .map(([key, val]) => `${key}: ${val}`)
        .join("\n");
    } catch {
      textContent = record.payload || "";
    }

    const payloadPath = path.join(tmpDir, `payload_${record.ticket_code}.txt`);
    fs.writeFileSync(payloadPath, textContent, "utf-8");

    // 📦 تنظیم ZIP
    const zipName = `IranConnect_Request_${record.ticket_code}.zip`;
    res.setHeader("Content-Disposition", `attachment; filename=${zipName}`);
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip");
    archive.pipe(res);
    archive.file(payloadPath, { name: path.basename(payloadPath) });

    // 🧩 افزودن فایل‌های پیوست
    let attachments = [];
    if (Array.isArray(record.attachments)) {
      attachments = record.attachments;
    } else if (typeof record.attachments === "string") {
      try {
        attachments = JSON.parse(record.attachments || "[]");
      } catch {
        attachments = [];
      }
    }

    // ✅ بررسی لوکال یا Cloudinary
    for (const f of attachments) {
      if (!f?.path) continue;
      const fileName = f.filename || path.basename(f.path);

      if (f.path.startsWith("http") && f.path.includes("res.cloudinary.com")) {
        // ☁️ Cloudinary file → دانلود و افزودن به ZIP
        const response = await fetch(f.path);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          archive.append(buffer, { name: fileName });
          console.log(`☁️ Added Cloudinary file: ${fileName}`);
        } else {
          console.warn(`⚠️ Skipped (Cloudinary fetch failed): ${f.path}`);
        }
      } else {
        // 📁 فایل محلی
        const cleanPath = f.path.replace(/^\/+/, "");
        const absPath = path.join(
          process.cwd(),
          "backend",
          cleanPath
        );

        if (fs.existsSync(absPath)) {
          archive.file(absPath, { name: fileName });
          console.log(`✅ Added local file: ${fileName}`);
        } else {
          console.warn(`⚠️ File not found locally: ${absPath}`);
        }
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("❌ downloadRequestData error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

