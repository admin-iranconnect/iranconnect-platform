// backend/controllers/adminContactRequestsController.js
import db from "../db.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/* =====================================================
   ✉️ تابع ارسال پاسخ ایمیلی به کاربر
===================================================== */
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
            Regarding your request <em>${formattedSubject}</em>, our team has reviewed it.<br/><br/>
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

  // ✅ ثبت لاگ ایمیل
  await db.query(
    `INSERT INTO email_logs (recipient_email, sender, type, status)
     VALUES ($1, $2, $3, $4)`,
    [to, "support@iranconnect.org", "contact_reply", "sent"]
  );
}

/* =====================================================
   🧾 لیست همه درخواست‌های تماس
===================================================== */
export async function listContactRequests(req, res) {
  try {
    const q = `
      SELECT cr.*, u.email AS admin_email
      FROM contact_requests cr
      LEFT JOIN users u ON cr.handled_by = u.id
      ORDER BY cr.created_at DESC
    `;
    const { rows } = await db.query(q);
    res.json(rows);
  } catch (err) {
    console.error("❌ listContactRequests error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* =====================================================
   🔍 دریافت جزئیات یک درخواست
===================================================== */
export async function getContactRequestById(req, res) {
  try {
    const { id } = req.params;
    const q = `
      SELECT cr.*, u.email AS admin_email
      FROM contact_requests cr
      LEFT JOIN users u ON cr.handled_by = u.id
      WHERE cr.id = $1
    `;
    const { rows } = await db.query(q, [id]);
    if (!rows.length) return res.status(404).json({ error: "Request not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ getContactRequestById error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* =====================================================
   📩 ارسال پاسخ ادمین به کاربر
===================================================== */
export async function replyToContactRequest(req, res) {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const adminId = req.user?.id;

    if (!admin_note?.trim()) {
      return res.status(400).json({ error: "Admin note is required." });
    }

    // گرفتن اطلاعات درخواست برای ارسال ایمیل
    const { rows } = await db.query(
      `SELECT * FROM contact_requests WHERE id=$1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Request not found." });
    const r = rows[0];

    // ارسال ایمیل پاسخ
    await sendReplyEmail(r.email, r.name, admin_note, r.subject_type, r.custom_subject);

    // بروزرسانی وضعیت در جدول
    await db.query(
      `UPDATE contact_requests 
       SET status='handled', handled_by=$1, handled_at=NOW(), admin_note=$2
       WHERE id=$3`,
      [adminId, admin_note, id]
    );

    res.json({ success: true, message: "Reply sent and request marked as handled." });
  } catch (err) {
    console.error("❌ replyToContactRequest error:", err);
    res.status(500).json({ error: "Server error while sending reply." });
  }
}
