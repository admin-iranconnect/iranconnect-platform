// backend/controllers/adminBulkEmailController.js
import fs from "fs";
import ExcelJS from "exceljs";
import pool from "../db.js";
import { sendBulkEmail } from "../utils/bulkMailer.js";
import { generateBulkEmailPDF, generateBulkEmailXLSX } from "../utils/reportGenerator.js";

/**
 * 📩 ارسال ایمیل گروهی با پشتیبانی از فایل‌های ضمیمه (buffer-based)
 */
export async function sendBulkEmailController(req, res) {
  const { sender_email, subject, body } = req.body;
  const admin_id = req.user?.id || 1;
  const uploadedFiles = req.files || [];

  try {
    const usersRes = await pool.query("SELECT id, email FROM users WHERE email IS NOT NULL");
    const allUsers = usersRes.rows;
    const total = allUsers.length;

    if (total === 0)
      return res.status(400).json({ error: "No users with valid email addresses found." });

    const logRes = await pool.query(
      `INSERT INTO bulk_email_logs (admin_id, sender_email, subject, body, total_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [admin_id, sender_email, subject, body, total]
    );
    const bulkId = logRes.rows[0].id;

    const formattedCode = `BID-${String(bulkId).padStart(6, "0")}`;
    await pool.query("UPDATE bulk_email_logs SET bulk_code = $1 WHERE id = $2", [
      formattedCode,
      bulkId,
    ]);

    const result = await sendBulkEmail(bulkId, sender_email, subject, body, allUsers, uploadedFiles);

    await pool.query("UPDATE bulk_email_logs SET sent_count = $1 WHERE id = $2", [
      result.successCount,
      bulkId,
    ]);

    return res.status(200).json({
      message: "Emails sent successfully ✅",
      bulk_id: bulkId,
      bulk_code: formattedCode,
      total,
      sent: result.successCount,
    });
  } catch (err) {
    console.error("❌ Bulk email error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * 📜 دریافت فقط ۵ لاگ آخر ارسال‌ها
 */
export async function getBulkEmailLogs(req, res) {
  try {
    const { bulk_code } = req.query;

    if (bulk_code) {
      const numericCode = parseInt(bulk_code, 10);
      const fullCode = `BID-${String(numericCode).padStart(6, "0")}`;
      const singleQuery = `
        SELECT 
          l.id, l.bulk_code, l.sender_email, l.subject, l.sent_count, l.total_count, 
          l.created_at, u.email AS admin_email
        FROM bulk_email_logs l
        LEFT JOIN users u ON l.admin_id = u.id
        WHERE l.bulk_code = $1;
      `;
      const { rows } = await pool.query(singleQuery, [fullCode]);
      return res.json(rows);
    }

    const logsQuery = `
      SELECT 
        l.id, l.bulk_code, l.sender_email, l.subject, l.sent_count, l.total_count,
        l.created_at, u.email AS admin_email
      FROM bulk_email_logs l
      LEFT JOIN users u ON l.admin_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 5;
    `;
    const { rows } = await pool.query(logsQuery);
    res.json(rows);
  } catch (err) {
    console.error("❌ DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
}

/**
 * 🧾 دانلود گزارش PDF
 */
export async function downloadBulkEmailPDF(req, res) {
  try {
    const { id } = req.params;
    const pdfPath = await generateBulkEmailPDF(id);
    res.download(pdfPath, `bulk_email_report_${id}.pdf`, (err) => {
      if (err) console.error(err);
      fs.unlinkSync(pdfPath);
    });
  } catch (err) {
    console.error("❌ PDF generation error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
}

/**
 * 📊 دانلود گزارش XLSX
 */
export async function downloadBulkEmailXLSX(req, res) {
  try {
    const { id } = req.params;
    const filePath = await generateBulkEmailXLSX(id);
    res.download(filePath, `bulk_email_report_${id}.xlsx`, (err) => {
      if (err) console.error(err);
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ XLSX generation error:", err);
    res.status(500).json({ error: "Failed to generate XLSX" });
  }
}

/**
 * 📊 گزارش فیلترشده (XLSX) بر اساس نوع و مقدار فیلتر
 */
export async function downloadFilteredBulkEmailReport(req, res) {
  try {
    const { filter, value } = req.query;

    if (!filter) return res.status(400).json({ error: "Filter type required." });

    let whereClause = "";
    const params = [];

    switch (filter) {
      case "sender_email":
        whereClause = "WHERE l.sender_email ILIKE $1";
        params.push(`%${value}%`);
        break;
      case "admin_email":
        whereClause = "WHERE u.email ILIKE $1";
        params.push(`%${value}%`);
        break;
      case "date":
        if (!value)
          return res.status(400).json({ error: "Please provide date in DD/MM/YYYY format." });
        const [day, month, year] = value.split("/");
        whereClause = "WHERE DATE(l.created_at) = $1";
        params.push(`${year}-${month}-${day}`);
        break;
      default:
        return res.status(400).json({ error: "Invalid filter type." });
    }

    const query = `
      SELECT 
        l.bulk_code, l.sender_email, l.sent_count, l.total_count, l.created_at,
        u.email AS admin_email
      FROM bulk_email_logs l
      LEFT JOIN users u ON l.admin_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC;
    `;
    const { rows } = await pool.query(query, params);

    if (rows.length === 0)
      return res.status(404).json({ error: "No records found for this filter." });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Filtered Bulk Report");

    const requester = "admin@iranconnect.org"; // 👈 بعداً جایگزین ادمین واقعی میشه
    const now = new Date().toLocaleString("en-GB");

    sheet.addRow(["Report Requested By", requester]);
    sheet.addRow(["Generated On", now]);
    sheet.addRow([]);
    sheet.addRow(["Bulk Code", "Sender Email", "Sent Count", "Date & Time", "Admin Email"]);

    rows.forEach((r) =>
      sheet.addRow([
        r.bulk_code,
        r.sender_email,
        `${r.sent_count}/${r.total_count}`,
        new Date(r.created_at).toLocaleString("en-GB"),
        r.admin_email,
      ])
    );

    const filePath = `/tmp/filtered_bulk_report_${filter}_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, `bulk_report_${filter}.xlsx`, (err) => {
      if (err) console.error(err);
      fs.unlink(filePath, () => {});
    });
  } catch (err) {
    console.error("❌ Filtered report error:", err);
    res.status(500).json({ error: "Failed to generate filtered report." });
  }
}
