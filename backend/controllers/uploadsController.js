// backend/controllers/uploadsController.js
import crypto from "crypto";
import { scanBuffer } from "../utils/virusScanner.js";
import pool from "../db.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

/**
 * Controller for secure file upload:
 * - Virus scan with ClamAV
 * - Secure upload to Cloudinary
 * - Full logging in PostgreSQL
 */
export async function handleSecureUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // 🧩 آماده‌سازی متادیتا برای لاگ
    const meta = {
      userId: req.user?.id || null,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      ip: req.ip,
    };

    // 🧠 Virus scan
    const scan = await scanBuffer(file.buffer, meta);

    // 🔴 اگر فایل آلوده بود، در دیتابیس ثبت شود و متوقف گردد
    if (scan.infected) {
      await pool.query(
        `INSERT INTO uploads (file_name, mime_type, size, checksum, scan_status, scan_result, quarantined)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          file.originalname,
          file.mimetype,
          file.size,
          checksum,
          "infected",
          JSON.stringify(scan.viruses || []),
          true,
        ]
      );

      return res.status(400).json({
        error: "File contains malware and has been quarantined.",
        viruses: scan.viruses || [],
      });
    }

    // 🟢 اگر فایل سالم بود
    const dbRes = await pool.query(
      `INSERT INTO uploads (file_name, mime_type, size, checksum, scan_status, scan_result, quarantined)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        file.originalname,
        file.mimetype,
        file.size,
        checksum,
        "clean",
        JSON.stringify(scan.viruses || []),
        false,
      ]
    );

    const uploadId = dbRes.rows[0].id;
    let finalUrl = null;

    // ☁️ آپلود به Cloudinary
    try {
      const uploadResult = await uploadToCloudinary(file.buffer, file.originalname);
      finalUrl = uploadResult.secure_url;

      // بروزرسانی URL در دیتابیس
      await pool.query(`UPDATE uploads SET storage_url=$1 WHERE id=$2`, [finalUrl, uploadId]);
    } catch (cloudErr) {
      console.error("⚠️ Cloudinary upload failed:", cloudErr.message);

      // fallback: ایجاد URL موقت محلی
      finalUrl = `https://cdn.iranconnect.org/uploads/${uploadId}_${file.originalname.replace(/\s+/g, "_")}`;

      await pool.query(`UPDATE uploads SET storage_url=$1 WHERE id=$2`, [finalUrl, uploadId]);
    }

    // ✅ پاسخ نهایی
    return res.json({
      success: true,
      message: "✅ File uploaded, scanned, and stored securely.",
      file_url: finalUrl,
      scan_result: scan,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    return res.status(500).json({ error: "Server error during upload." });
  }
}
