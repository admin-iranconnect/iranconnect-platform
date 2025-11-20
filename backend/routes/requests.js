//backend/routes/requests.js
import express from "express";
import path from "path";
import fs from "fs";
import db from "../db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import secureUpload from "../middleware/uploadSecure.js";
import { uploadToCloudinary } from "../utils/cloudinary.js"; // اضافه

const router = express.Router();

/* ============================================================
   🧠 توابع کمکی
   ============================================================ */
async function generateTicketCode(request_type, client) {
  let seqName;
  if (request_type === "claim") seqName = "ticket_seq_bc";
  else if (request_type === "update") seqName = "ticket_seq_bu";
  else if (request_type === "delete") seqName = "ticket_seq_bd";
  else if (request_type === "new") seqName = "ticket_seq_bn";
  else throw new Error("Invalid request type");

  const { rows } = await client.query(`SELECT nextval('${seqName}') AS seq`);
  const seq = rows[0].seq;
  const prefix =
    request_type === "claim"
      ? "IC-BC"
      : request_type === "update"
      ? "IC-BU"
      : request_type === "delete"
      ? "IC-BD"
      : "IC-BN";
  const code = `${prefix}${String(seq).padStart(7, "0")}`;
  return { seq, code };
}

async function checkRateLimit(user_id, request_type, client) {
  const { rows } = await client.query(
    `SELECT COUNT(*) FROM business_requests
     WHERE user_id=$1 AND request_type=$2
       AND created_at >= NOW() - INTERVAL '24 HOURS'`,
    [user_id, request_type]
  );
  return parseInt(rows[0].count) > 0;
}

/* ============================================================
   📬 ایجاد درخواست جدید (new/update/delete/claim)
   ============================================================ */
router.post("/", verifyToken, secureUpload.array("files", 5), async (req, res) => {
  try {
    const client = db;
    const { request_type, business_id, payload, claim_id } = req.body;

    if (!request_type)
      return res.status(400).json({ error: "request_type is required" });

    /* ✅ بررسی مالک بودن بر اساس user_id و business_claims */
    if (["update", "delete"].includes(request_type)) {
      // 1️⃣ بررسی اینکه بیزینس تأییدشده است
      const bizCheck = await db.query(
        `SELECT id, owner_verified FROM businesses WHERE id=$1`,
        [business_id]
      );

      if (!bizCheck.rows.length || bizCheck.rows[0].owner_verified !== true) {
        return res.status(403).json({
          error:
            "This business is not verified for owner updates/deletions yet.",
        });
      }

      // 2️⃣ بررسی اینکه کاربر claim تاییدشده دارد
      const claimCheck = await db.query(
        `SELECT id FROM business_claims
         WHERE business_id=$1 AND user_id=$2 AND status='verified'
         LIMIT 1`,
        [business_id, req.user.id]
      );

      if (!claimCheck.rows.length) {
        return res.status(403).json({
          error:
            "Only the verified claimant of this business can submit this type of request.",
        });
      }
    }

    // ⏱ محدودیت روزانه
    const hasRecent = await checkRateLimit(req.user.id, request_type, client);
    if (hasRecent) {
      return res.status(429).json({
        error: "You can only submit one request of this type every 24 hours.",
      });
    }

    // 🎫 ساخت تیکت جدید
    const { seq, code } = await generateTicketCode(request_type, client);

    // ☁️ آپلود به Cloudinary
    const uploadedFiles = [];
    for (const f of req.files || []) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(f.originalname);
      const cloudFileName = f.fieldname + "-" + uniqueSuffix + ext;
      try {
        const cloudRes = await uploadToCloudinary(f.buffer, cloudFileName, `business_${request_type}`);
        uploadedFiles.push({
          filename: f.originalname,
          mimetype: f.mimetype,
          path: cloudRes.secure_url, // ✅ لینک Cloudinary
        });
      } catch (err) {
        console.error("❌ Cloudinary upload error:", err.message);
      }
    }

    // 🗃 ثبت در دیتابیس
    const insertQuery = `
      INSERT INTO business_requests
      (user_id, business_id, claim_id, request_type, payload, attachments,
       ticket_seq, ticket_code, ip_address, user_agent)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
    `;
    const values = [
      req.user.id,
      business_id || null,
      claim_id || null,
      request_type,
      payload ? JSON.stringify(payload) : {},
      JSON.stringify(uploadedFiles),
      seq,
      code,
      req.ip,
      req.get("User-Agent"),
    ];

    const { rows } = await client.query(insertQuery, values);

    res.status(201).json({
      message: "✅ Request successfully created",
      ticket_code: code,
      files: uploadedFiles,
      request: rows[0],
    });
  } catch (err) {
    console.error("❌ Error creating request:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/* ============================================================
   📜 لیست درخواست‌های کاربر (با پشتیبانی از نمایش name برای درخواست new)
   ============================================================ */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT br.*, b.name AS business_name
         FROM business_requests br
         LEFT JOIN businesses b ON br.business_id = b.id
        WHERE br.user_id=$1
        ORDER BY br.created_at DESC`,
      [req.user.id]
    );

    // ✅ اگر نوع درخواست new بود و business_name تهی بود، name از payload گرفته می‌شود
    const result = rows.map((r) => {
      let business_name = r.business_name;
      if ((!business_name || business_name.trim() === "") && r.request_type === "new") {
        try {
          const payload = JSON.parse(r.payload || "{}");
          business_name = payload.name || "(Unnamed)";
        } catch {
          business_name = "(Unnamed)";
        }
      }
      return { ...r, business_name };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   📋 لیست بیزینس‌های تاییدشده‌ی مالک فعلی
   ============================================================ */
router.get("/owned-businesses", verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT b.id,
             b.name,
             b.city,
             b.country,
             b.category,
             b.sub_category
      FROM business_claims c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.user_id = $1
        AND c.status = 'verified'
        AND b.owner_verified = true
      GROUP BY b.id, b.name, b.city, b.country, b.category, b.sub_category
      ORDER BY b.name ASC;
      `,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching owned businesses:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* ============================================================
   📂 مسیر دسترسی به فایل‌ها
   ============================================================ */
router.get("/files/:type/:filename", verifyToken, (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(process.cwd(), "uploads", "business", type, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "File not found" });
  res.sendFile(filePath);
});

export default router;
