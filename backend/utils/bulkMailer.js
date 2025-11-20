//backend/utils/bulkMailer.js
import pool from "../db.js";
import { sendEmail } from "./sendEmail.js";

/**
 * 📩 ارسال ایمیل گروهی (BCC) با فایل‌های ضمیمه (memory buffer)
 */
export async function sendBulkEmail(
  bulkId,
  senderEmail,
  subject,
  htmlBody,
  users,
  uploadedFiles = []
) {
  const userEmails = users.map((u) => u.email);

  // 📎 ضمیمه‌ها را از حافظه (memory buffer) آماده کن
  const attachments =
    uploadedFiles.length > 0
      ? uploadedFiles.map((file) => ({
          filename: file.originalname,
          content: file.buffer,
        }))
      : [];

  let successCount = 0;

  try {
    // ✅ ارسال ایمیل با BCC همه کاربران
    const result = await sendEmail({
      from: senderEmail,
      bcc: userEmails,
      subject,
      html: htmlBody,
      attachments,
    });

    if (result.success) {
      successCount = userEmails.length;

      // ✅ ثبت وضعیت هر گیرنده (موفق)
      const insertValues = users.map(
        (u) => `(${bulkId}, '${u.email}', 'success', NOW())`
      );
      await pool.query(
        `INSERT INTO bulk_email_recipients (bulk_id, recipient_email, status, sent_at)
         VALUES ${insertValues.join(",")}`
      );
    } else {
      // ❌ ثبت وضعیت ناموفق برای همه
      const insertValues = users.map(
        (u) => `(${bulkId}, '${u.email}', 'failed', NOW())`
      );
      await pool.query(
        `INSERT INTO bulk_email_recipients (bulk_id, recipient_email, status, sent_at)
         VALUES ${insertValues.join(",")}`
      );
    }

    return { successCount };
  } catch (error) {
    console.error("❌ Bulk send error:", error);
    return { successCount };
  }
}
