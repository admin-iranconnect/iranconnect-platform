// backend/routes/admin_contactRequests.js
import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import db from "../db.js";

const router = express.Router();

/* =======================================================
   🛡 Middleware بررسی نقش ادمین (مطابق منطق پروژه)
======================================================= */
function adminOnly(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!["admin", "superadmin"].includes(decoded.role))
      return res.status(403).json({ error: "Admin access required" });

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* =======================================================
   ✉️ تابع ارسال ایمیل پاسخ به کاربر
======================================================= */
async function sendReplyEmail(to, userName, adminNote, subjectType, customSubject) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_SUPPORT_USER,
      pass: process.env.GMAIL_SUPPORT_PASS,
    },
  });

  const formattedSubject =
    subjectType === "other"
      ? (customSubject?.trim() || "your custom request")
      : subjectType.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

  const subject = "Response from IranConnect Support";
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f5f7fa;padding:24px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="max-width:560px;margin:0 auto;background:#ffffff;
             border:1px solid #e6e8ee;border-radius:14px;
             box-shadow:0 6px 18px rgba(10,29,55,0.06);">
      <tr>
        <td style="padding:24px;text-align:center;">
          <h2 style="color:#0A1D37;">IranConnect Support</h2>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px;">
          <p style="font-size:15px;color:#0a1b2a;">
            Dear <strong>${userName || "User"}</strong>,<br/><br/>
            Regarding your request (<em>${formattedSubject}</em>), our team has reviewed it.<br/><br/>
            <strong>Admin’s note:</strong><br/>
            <blockquote style="border-left:3px solid #00bfa6;padding-left:10px;color:#0a1b2a;">
              ${adminNote}
            </blockquote>
            <br/>
            Thank you for reaching out to IranConnect.<br/><br/>
            Kind regards,<br/>
            <strong>IranConnect Support Team</strong>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 24px;text-align:center;">
          <a href="https://iranconnect.org" 
             style="color:#00bfa6;text-decoration:none;font-weight:600;">
            Visit IranConnect
          </a>
        </td>
      </tr>
    </table>
  </div>`;

  await transporter.sendMail({
    from: `"IranConnect Support" <support@iranconnect.org>`,
    to,
    subject,
    html,
  });

  await db.query(
    `INSERT INTO email_logs (recipient_email, sender, type, status)
     VALUES ($1,$2,$3,$4)`,
    [to, "support@iranconnect.org", "contact_reply", "sent"]
  );
}

/* =======================================================
   🟢 لیست تمام Contact Requests (با فیلتر و حالت پیش‌فرض Pending)
======================================================= */
router.get("/", adminOnly, async (req, res) => {
  try {
    // 🧩 پارامترهای فیلتر از Query
    const { name, email, subject, status, date } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    // 🔍 فیلترهای جستجو
    if (name) {
      params.push(`%${name}%`);
      where += ` AND LOWER(cr.name) ILIKE LOWER($${params.length})`;
    }
    if (email) {
      params.push(`%${email}%`);
      where += ` AND LOWER(cr.email) ILIKE LOWER($${params.length})`;
    }
    if (subject) {
      params.push(`%${subject}%`);
      where += ` AND (LOWER(cr.subject_type) ILIKE LOWER($${params.length}) OR LOWER(cr.custom_subject) ILIKE LOWER($${params.length}))`;
    }

    // ⚙️ شرط اصلی فقط Pending — مگر اینکه فیلتر status ارسال شده باشد
    if (status) {
      params.push(status);
      where += ` AND cr.status = $${params.length}`;
    } else {
      where += ` AND cr.status = 'pending'`;
    }

    if (date) {
      params.push(date);
      where += ` AND DATE(cr.created_at) = $${params.length}`;
    }

    const query = `
      SELECT cr.*, u.email AS admin_email
      FROM contact_requests cr
      LEFT JOIN users u ON cr.handled_by = u.id
      ${where}
      ORDER BY cr.created_at DESC
      LIMIT 500
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ listContactRequests error:", err);
    res.status(500).json({ error: "Server error while fetching requests" });
  }
});
/* =======================================================
   🔍 جزئیات یک درخواست خاص
======================================================= */
router.get("/:id", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT cr.*, u.email AS admin_email
       FROM contact_requests cr
       LEFT JOIN users u ON cr.handled_by = u.id
       WHERE cr.id = $1`,
      [id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Request not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ getContactRequestById error:", err);
    res.status(500).json({ error: "Server error while fetching details" });
  }
});

/* =======================================================
   ✉️ ارسال پاسخ و بروز رسانی وضعیت
======================================================= */
router.post("/:id/reply", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    if (!admin_note?.trim())
      return res.status(400).json({ error: "Admin note is required" });

    const { rows } = await pool.query(
      "SELECT * FROM contact_requests WHERE id=$1",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Request not found" });

    const r = rows[0];

    // ⚠️ جلوگیری از ارسال مجدد پاسخ برای درخواست‌های handled
    if (r.status === "handled") {
      return res.status(400).json({
        error: "This request has already been handled and cannot be modified.",
      });
    }
    
    // ارسال ایمیل پاسخ
    await sendReplyEmail(r.email, r.name, admin_note, r.subject_type, r.custom_subject);

    // بروزرسانی رکورد
    await pool.query(
      `UPDATE contact_requests 
       SET status='handled', handled_by=$1, handled_at=NOW(), admin_note=$2
       WHERE id=$3`,
      [req.user.id, admin_note, id]
    );

    res.json({ message: "Reply sent and request marked as handled" });
  } catch (err) {
    console.error("❌ replyToContactRequest error:", err);
    res.status(500).json({ error: "Server error while sending reply" });
  }
});

import {
  exportContactRequestsXLSX,
  exportContactRequestsPDF,
} from "../controllers/adminContactRequestsExportController.js";

router.get("/export/xlsx", adminOnly, exportContactRequestsXLSX);
router.get("/export/pdf", adminOnly, exportContactRequestsPDF);

export default router;
