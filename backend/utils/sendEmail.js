// backend/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

/**
 * ارسال ایمیل با پشتیبانی از Gmail Workspace و تصاویر درون‌خطی (CID)
 *
 * @param {Object} options
 * @param {String} options.from
 * @param {String[]} [options.to]
 * @param {String[]} [options.bcc]
 * @param {String} options.subject
 * @param {String} options.html
 * @param {Array} [options.attachments]
 * @returns {Promise<Object>}
 */
export async function sendEmail({
  from,
  to = [],
  bcc = [],
  subject,
  html,
  attachments = [],
}) {
  try {
    // 📦 انتخاب حساب Gmail مناسب
    let user = "";
    let pass = "";

    if (from?.includes("privacy@")) {
      user = process.env.GMAIL_PRIVACY_USER;
      pass = process.env.GMAIL_PRIVACY_PASS;
    } else if (from?.includes("support@")) {
      user = process.env.GMAIL_SUPPORT_USER;
      pass = process.env.GMAIL_SUPPORT_PASS;
    } else if (from?.includes("info@")) {
      user = process.env.GMAIL_INFO_USER;
      pass = process.env.GMAIL_INFO_PASS;
    } else if (from?.includes("verify@")) {
      user = process.env.GMAIL_VERIFICATION_USER;
      pass = process.env.GMAIL_VERIFICATION_PASS;
    } else if (from?.includes("no-reply@")) {
      user = process.env.GMAIL_NOREPLY_USER;
      pass = process.env.GMAIL_NOREPLY_PASS;
    } else {
      throw new Error(`No matching Gmail account for sender: ${from}`);
    }

    // 🧩 اسکن HTML برای پیدا کردن تصاویر base64 (مثلاً <img src="data:image/png;base64,...">)
    const inlineAttachments = [];
    let processedHtml = html;

    const imgRegex = /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const dataUrl = match[1];
      const cid = `cid_${crypto.randomUUID()}@iranconnect`;

      // 🔄 جایگزینی در HTML
      processedHtml = processedHtml.replace(dataUrl, `cid:${cid}`);

      // 📎 تبدیل Base64 به باینری برای ضمیمه
      const base64Data = dataUrl.split(",")[1];
      const mimeType = dataUrl.match(/data:(image\/[^;]+)/)?.[1] || "image/png";

      inlineAttachments.push({
        filename: `inline-${cid}.${mimeType.split("/")[1]}`,
        content: Buffer.from(base64Data, "base64"),
        cid,
      });
    }

    // 🧠 ادغام فایل‌های ضمیمه معمولی و تصاویر درون‌خطی
    const allAttachments = [...attachments, ...inlineAttachments];

    // ✅ تنظیم SMTP برای Gmail Workspace
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const mailOptions = {
      from,
      to,
      bcc,
      subject,
      html: processedHtml,
      attachments: allAttachments,
    };

    // 📤 ارسال
    const info = await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent from ${from} → MessageID: ${info.messageId}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return { success: false, error: error.message };
  }
}
/* =====================================================
   ✉️ ارسال ایمیل بازیابی رمز عبور (Password Reset)
   ===================================================== */

export async function sendPasswordResetEmail({ to, token }) {
  try {
    const baseUrl = process.env.FRONTEND_BASE_URL || "https://iranconnect.fr";
    const resetLink = `${baseUrl}/auth/change-password?token=${encodeURIComponent(token)}`

    const brand = {
      navy: "#0A1D37",
      turquoise: "#00bfa6",
      text: "#0a1b2a",
      bg: "#ffffff",
      soft: "#f5f7fa",
      border: "#e6e8ee",
    };

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:${brand.soft};padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:560px;margin:0 auto;background:${brand.bg};
                 border:1px solid ${brand.border};border-radius:14px;
                 box-shadow:0 6px 18px rgba(10,29,55,0.06);">
          <tr>
            <td style="padding:24px;text-align:center;">
              <h2 style="color:${brand.navy};margin-bottom:0;">IranConnect</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px;text-align:center;">
              <h2 style="margin:0;color:${brand.navy};font-size:22px;">Reset your password</h2>
              <p style="color:${brand.text};opacity:.9;margin:8px 0;font-size:14px;">
                Click the button below to reset your password. This link is valid for 5 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;">
              <a href="${resetLink}"
                 style="display:inline-block;background:${brand.turquoise};
                        color:#0A1D37;text-decoration:none;padding:12px 24px;
                        border-radius:12px;font-weight:600;font-size:16px;">
                 Reset Password
              </a>
              <p style="color:${brand.text};opacity:.8;margin:10px 0;font-size:13px;">
                If you didn’t request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;text-align:center;">
              <hr style="border:none;border-top:1px solid ${brand.border};margin:10px 0 16px"/>
              <p style="margin:0;color:${brand.text};opacity:.7;font-size:12px;">
                © ${new Date().getFullYear()}
                <span style="color:${brand.turquoise};font-weight:600">IranConnect</span>
              </p>
            </td>
          </tr>
        </table>
      </div>`;

    return await sendEmail({
      from: "no-reply@iranconnect.org",
      to: [to],
      subject: "🔐 Password Reset — IranConnect",
      html,
    });
  } catch (error) {
    console.error("❌ sendPasswordResetEmail failed:", error);
    return { success: false, error: error.message };
  }
}
