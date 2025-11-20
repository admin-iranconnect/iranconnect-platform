// backend/controllers/adminClaimController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadToCloudinary } from "../utils/cloudinary.js"; // ✅ اضافه شد
import multer from "multer"; // برای استفاده از upload در همین کنترلر

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* 📁 تنظیم آپلود در حافظه (برای مدارک مالکیت) */
const storage = multer.memoryStorage();
export const uploadClaimFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // حداکثر 10MB برای مدارک
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
    cb(null, true);
  },
}).single("document");

/* ───────────── 📎 آپلود مدرک مالکیت ───────────── */
export async function uploadClaimDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // ✅ منطق نام‌گذاری فایل مشابه منطق بیزینس‌ها
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(req.file.originalname);
    const fileName = req.file.fieldname + "-" + uniqueSuffix + ext;

    // ☁️ آپلود فایل به Cloudinary
    const cloud = await uploadToCloudinary(req.file.buffer, "claim_docs", fileName, req.file.mimetype);

    // 🧾 ذخیره لینک Cloudinary در دیتابیس
    const { claim_id } = req.body;
    if (!claim_id) return res.status(400).json({ error: "claim_id is required" });

    await pool.query(
      "UPDATE business_claims SET document_url=$1 WHERE id=$2",
      [cloud.secure_url, claim_id]
    );

    return res.json({
      success: true,
      message: "✅ Document uploaded successfully.",
      document_url: cloud.secure_url,
    });
  } catch (err) {
    console.error("❌ uploadClaimDocument error:", err);
    res.status(500).json({ error: "Server error uploading document" });
  }
}

/* ───────────── 📎 دانلود فایل مدرک مالکیت ───────────── */
export async function downloadClaimDocument(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT document_url FROM business_claims WHERE id=$1",
      [id]
    );

    if (result.rowCount === 0 || !result.rows[0].document_url)
      return res.status(404).json({ error: "File not found" });

    const fileUrl = result.rows[0].document_url;

    // ✅ اگر Cloudinary URL است، فقط Redirect کن
    if (fileUrl.startsWith("http")) {
      return res.redirect(fileUrl);
    }

    // 🔙 حالت پشتیبان (در صورت وجود فایل محلی قدیمی)
    const relativePath = fileUrl.replace(/^\/+/, "");
    const filePath = path.join(process.cwd(), relativePath);

    if (!fs.existsSync(filePath)) {
      console.error("❌ File not found on server:", filePath);
      return res.status(404).json({ error: "File missing on server" });
    }

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
        res.status(500).json({ error: "Error sending file" });
      }
    });
  } catch (err) {
    console.error("❌ downloadClaimDocument error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 📋 لیست تمام درخواست‌ها ───────────── */
export async function listClaims(req, res) {
  try {
    const { status } = req.query;
    const result = await pool.query(
      `
      SELECT 
        c.id, c.email, c.phone, c.status, c.claim_token, c.created_at,
        c.admin_note, c.verified_at, c.processed_at,
        c.full_name, c.applicant_role, c.description, c.document_url,
        b.name AS business_name, b.id AS business_id, b.owner_verified,
        u.email AS user_email
      FROM business_claims c
      JOIN businesses b ON c.business_id = b.id
      LEFT JOIN users u ON u.id = c.user_id
      ${status ? "WHERE c.status = $1" : ""}
      ORDER BY c.created_at DESC
      LIMIT 10
      `,
      status ? [status] : []
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("❌ listClaims error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── ✅ تأیید درخواست ───────────── */
export async function approveClaim(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: "Approval note is required." });
    }

    await client.query("BEGIN");
    const claimRes = await client.query(
      `
      SELECT c.*, b.owner_verified
      FROM business_claims c
      JOIN businesses b ON c.business_id = b.id
      WHERE c.id=$1 FOR UPDATE
      `,
      [id]
    );

    if (claimRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = claimRes.rows[0];
    if (["verified", "rejected"].includes(claim.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Claim already ${claim.status} and cannot be modified.`,
      });
    }

    if (claim.owner_verified) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error:
          "This business is already verified. You cannot approve another claim for it.",
      });
    }

    /* ✅ به‌روزرسانی وضعیت بیزینس و کلیم */
    await client.query(
      `
      UPDATE businesses 
      SET owner_verified = TRUE,
          owner_email = $1,
          owner_verified_at = NOW()
      WHERE id = $2
      `,
      [claim.email, claim.business_id]
    );

    await client.query(
      `
      UPDATE business_claims
      SET status='verified',
          admin_note=$1,
          verified_at=NOW(),
          processed_at=NOW()
      WHERE id=$2
      `,
      [note.trim(), id]
    );

    /* 🧩 همگام‌سازی با جدول business_requests */
    const reqRes = await client.query(
      "SELECT id FROM business_requests WHERE claim_id=$1",
      [id]
    );

    if (reqRes.rowCount > 0) {
      // ✅ اگر رکورد موجود است → آپدیت وضعیت
      await client.query(
        `
        UPDATE business_requests
        SET status='approved',
            admin_note=$1,
            processed_at=NOW(),
            processed_by=$2
        WHERE claim_id=$3
        `,
        [note.trim(), req.user?.id || null, id]
      );
    } else {
      // ✅ اگر وجود ندارد → درج جدید برای ردیابی
      const seqRes = await client.query(`SELECT nextval('ticket_seq_bc') AS seq`);
      const seq = seqRes.rows[0].seq;
      const ticketCode = `IC-BC${String(seq).padStart(7, "0")}`;

      await client.query(
        `
        INSERT INTO business_requests
          (user_id, business_id, claim_id, request_type, ticket_seq, ticket_code,
           status, admin_note, processed_at, processed_by, created_at)
        VALUES ($1,$2,$3,'claim',$4,$5,'approved',$6,NOW(),$7,NOW())
        `,
        [
          claim.user_id || null,
          claim.business_id,
          claim.id,
          seq,
          ticketCode,
          note.trim(),
          req.user?.id || null,
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`✅ Claim #${id} approved and synced with business_requests`);
    return res.json({ success: true, message: "Claim approved successfully" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ approveClaim error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
/* ───────────── ❌ رد درخواست ───────────── */
export async function rejectClaim(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: "Rejection note is required." });
    }

    await client.query("BEGIN");
    const claimRes = await client.query(
      `
      SELECT c.*, b.owner_verified
      FROM business_claims c
      JOIN businesses b ON c.business_id = b.id
      WHERE c.id=$1 FOR UPDATE
      `,
      [id]
    );

    if (claimRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = claimRes.rows[0];
    if (["verified", "rejected"].includes(claim.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Claim already ${claim.status} and cannot be changed.`,
      });
    }

    if (claim.owner_verified) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error:
          "This business has already been verified. You cannot reject a claim for it.",
      });
    }

    /* ✅ رد کلیم و ثبت یادداشت ادمین */
    await client.query(
      `
      UPDATE business_claims 
      SET status='rejected',
          admin_note=$1,
          processed_at=NOW()
      WHERE id=$2
      `,
      [note.trim(), id]
    );

    /* 🧩 همگام‌سازی وضعیت رد با business_requests */
    const reqRes = await client.query(
      "SELECT id FROM business_requests WHERE claim_id=$1",
      [id]
    );

    if (reqRes.rowCount > 0) {
      await client.query(
        `
        UPDATE business_requests
        SET status='rejected',
            admin_note=$1,
            processed_at=NOW(),
            processed_by=$2
        WHERE claim_id=$3
        `,
        [note.trim(), req.user?.id || null, id]
      );
    } else {
      const seqRes = await client.query(`SELECT nextval('ticket_seq_bc') AS seq`);
      const seq = seqRes.rows[0].seq;
      const ticketCode = `IC-BC${String(seq).padStart(7, "0")}`;

      await client.query(
        `
        INSERT INTO business_requests
          (user_id, business_id, claim_id, request_type, ticket_seq, ticket_code,
           status, admin_note, processed_at, processed_by, created_at)
        VALUES ($1,$2,$3,'claim',$4,$5,'rejected',$6,NOW(),$7,NOW())
        `,
        [
          claim.user_id || null,
          claim.business_id,
          claim.id,
          seq,
          ticketCode,
          note.trim(),
          req.user?.id || null,
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`⚠️ Claim #${id} rejected and synced with business_requests`);
    return res.json({ success: true, message: "Claim rejected successfully" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ rejectClaim error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}

/* ───────────── 📤 خروجی XLSX ───────────── */
export async function exportClaimsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        b.name AS business_name, 
        c.full_name, 
        c.applicant_role, 
        c.email, 
        c.phone, 
        c.claim_token, 
        c.status,
        c.created_at, 
        c.processed_at,
        c.admin_note,
        u.email AS user_email
      FROM business_claims c
      JOIN businesses b ON c.business_id = b.id
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Business Claims");

    sheet.columns = [
      { header: "Business", key: "business_name", width: 25 },
      { header: "Applicant", key: "full_name", width: 25 },
      { header: "Role", key: "applicant_role", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Submitted by (User)", key: "user_email", width: 25 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Claim Token", key: "claim_token", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Created", key: "created_at", width: 20 },
      { header: "Processed", key: "processed_at", width: 20 },
      { header: "Admin Note", key: "admin_note", width: 30 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0A1A44" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF00BFA6" } },
        bottom: { style: "thin", color: { argb: "FF00BFA6" } },
      };
    });

    result.rows.forEach((r) => sheet.addRow(r));

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_Claims_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportClaimsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 🧾 خروجی PDF ───────────── */
export async function exportClaimsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        b.name AS business_name, 
        c.full_name, 
        c.applicant_role, 
        c.email, 
        c.phone, 
        c.claim_token, 
        c.status,
        c.created_at, 
        c.processed_at,
        c.admin_note,
        u.email AS user_email
      FROM business_claims c
      JOIN businesses b ON c.business_id = b.id
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
    `);
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_Claims_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const logoPath = path.join(__dirname, "../../frontend/public/logo-light.png");
    if (fs.existsSync(logoPath)) {
      const logoWidth = 90;
      const logoX = (doc.page.width - logoWidth) / 2;
      doc.image(logoPath, logoX, 40, { width: logoWidth });
      doc.moveDown(6);
    }

    doc
      .fontSize(10)
      .fillColor("#0a1a44")
      .text("Businesses Claim Report", { align: "center" });
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(0.5);

    const headers = [
      "Business",
      "Applicant",
      "Role",
      "Email",
      "Submitted by",
      "Phone",
      "Status",
      "Created",
      "Processed",
    ];
    const colWidths = [80, 80, 50, 80, 55, 50, 50, 70, 70];

    let y = doc.y + 5;
    doc.fontSize(8).fillColor("#fff").rect(40, y, 515, 20).fill("#0a1a44").fillColor("#fff");
    let x = 45;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });
    y += 22;

    result.rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? "#f7f9fb" : "#fff";
      doc.fillColor(bg).rect(40, y, 515, 20).fill();
      doc.fillColor("#000").fontSize(7);
      const row = [
        r.business_name || "—",
        r.full_name || "—",
        r.applicant_role || "—",
        r.email || "—",
        r.phone || "—",
        r.status || "—",
        r.created_at ? new Date(r.created_at).toLocaleString() : "—",
        r.processed_at ? new Date(r.processed_at).toLocaleString() : "—",
      ];
      let cellX = 45;
      row.forEach((c, i) => {
        doc.text(c, cellX, y + 6, { width: colWidths[i], align: "left" });
        cellX += colWidths[i];
      });
      y += 20;
      if (y > 750) {
        doc.addPage();
        y = 60;
      }
    });

    doc.end();
  } catch (err) {
    console.error("❌ exportClaimsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

