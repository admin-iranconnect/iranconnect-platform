// backend/controllers/contactController.js
import db from "../db.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { verifyRecaptcha } from "../utils/verifyRecaptcha.js";

dotenv.config();

/* =======================================================
   ✉️ ارسال ایمیل تأیید به کاربر (نسخه مقاوم و ایمن)
   ======================================================= */
async function sendConfirmationEmail(email, name, subjectType, customSubject) {
  // ⚙️ ساخت ترنسپورتر امن (Gmail + App Password)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_SUPPORT_USER,
      pass: process.env.GMAIL_SUPPORT_PASS,
    },
  });

  // 🧩 تبدیل رشته‌ی subjectType به متن خوانا
  const formattedSubject =
    subjectType === "other"
      ? (customSubject && customSubject.trim() !== ""
          ? customSubject.trim()
          : "your custom request")
      : subjectType
          .replace(/_/g, " ")
          .replace(/\b\w/g, (ch) => ch.toUpperCase());

  // 📨 محتوای ایمیل
  const subject = "We received your message | IranConnect";
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
            Dear <strong>${name?.trim() || "User"}</strong>,<br/><br/>
            We’ve received your request regarding 
            <em>${formattedSubject}</em>.  
            Our support team will review it soon and contact you if needed.<br/><br/>
            Thank you for reaching out to us!  
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

  try {
    // 📤 ارسال ایمیل
    const result = await transporter.sendMail({
      from: `"IranConnect Support" <support@iranconnect.org>`,
      to: email,
      subject,
      html,
    });

    // ✅ ثبت لاگ موفق
    await db.query(
      `INSERT INTO email_logs (recipient_email, sender, type, status)
       VALUES ($1,$2,$3,$4)`,
      [email, "support@iranconnect.org", "contact_confirmation", "sent"]
    );

    console.log(`✅ Confirmation email sent to ${email} (${result.accepted?.[0] || "OK"})`);
    return true;
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);

    // ❗ ثبت خطا در لاگ
    await db.query(
      `INSERT INTO email_logs (recipient_email, sender, type, status, error_message)
       VALUES ($1,$2,$3,$4,$5)`,
      [email, "support@iranconnect.org", "contact_confirmation", "failed", err.message]
    );

    // بدون توقف عملکرد فرم
    return false;
  }
}

/* =======================================================
   🧩 ثبت درخواست تماس کاربر
   ======================================================= */
export async function submitContactRequest(req, res) {
  try {
    const {
      name,
      email,
      subjectType,
      customSubject,
      message,
      recaptchaToken,
    } = req.body;

    // 🧱 بررسی فیلدهای ضروری
    if (!name || !email || !subjectType || !message) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    // 🔒 بررسی reCAPTCHA (v2)
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({ error: "reCAPTCHA verification failed." });
    }

    // 🧠 بررسی وجود کاربر در جدول users
    const existingUser = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    const userId = existingUser.rowCount ? existingUser.rows[0].id : null;

    // 💾 ذخیره درخواست در جدول contact_requests
    await db.query(
      `INSERT INTO contact_requests 
        (user_id, name, email, subject_type, custom_subject, message, ip_address, recaptcha_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId, name, email, subjectType, customSubject, message, req.ip, true]
    );

    console.log(`🟢 Contact request saved for ${email}`);

    // ✉️ ارسال ایمیل تأیید به کاربر
    const mailStatus = await sendConfirmationEmail(email, name, subjectType, customSubject);

    // ✅ پاسخ نهایی به فرانت‌اند
    return res.json({
      success: true,
      message: mailStatus
        ? "✅ Your message was sent successfully!"
        : "⚠️ Message received, but confirmation email could not be sent.",
    });
  } catch (err) {
    console.error("❌ submitContactRequest error:", err.stack || err);
    return res.status(500).json({
      error: "Server error. Please try again later.",
    });
  }
}
