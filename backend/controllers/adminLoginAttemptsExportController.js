// backend/controllers/adminLoginAttemptsExportController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────────── 📤 Export Login Attempts to XLSX ───────────── */
export async function exportLoginAttemptsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        email,
        ip_address,
        success,
        user_agent,
        created_at
      FROM login_attempts
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Login Attempts");

    sheet.columns = [
      { header: "EMAIL", key: "email", width: 30 },
      { header: "IP ADDRESS", key: "ip_address", width: 20 },
      { header: "STATUS", key: "success", width: 15 },
      { header: "DEVICE", key: "user_agent", width: 50 },
      { header: "DATE", key: "created_at", width: 25 },
    ];

    // 🎨 استایل هدر دقیقاً مشابه File Logs
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

    // 🧩 داده‌ها
    result.rows.forEach((r) => {
      sheet.addRow({
        email: r.email || "—",
        ip_address: r.ip_address || "—",
        success: r.success ? "Success" : "Failed",
        user_agent: r.user_agent
          ? r.user_agent.slice(0, 80) + (r.user_agent.length > 80 ? "..." : "")
          : "—",
        created_at: r.created_at
          ? new Date(r.created_at).toLocaleString()
          : "—",
      });
    });

    // 📦 خروجی
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_LoginAttempts_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportLoginAttemptsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 🧾 Export Login Attempts to PDF ───────────── */
export async function exportLoginAttemptsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        email,
        ip_address,
        success,
        user_agent,
        created_at
      FROM login_attempts
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_LoginAttempts_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 🖼️ لوگو ایران‌کانکت بالای گزارش
    const logoPath = path.join(__dirname, "../../frontend/public/logo-light.png");
    if (fs.existsSync(logoPath)) {
      const logoWidth = 90;
      const logoX = (doc.page.width - logoWidth) / 2;
      doc.image(logoPath, logoX, 40, { width: logoWidth });
      doc.moveDown(6);
    }

    // عنوان و تاریخ تولید فایل
    doc
      .fontSize(10)
      .fillColor("#0a1a44")
      .text("User Login Attempts Report", { align: "center" });
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(9)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(0.5);

    // 🧾 هدر جدول
    const headers = ["Email", "IP", "Status", "Device", "Date"];
    const colWidths = [130, 60, 60, 160, 100];

    let y = doc.y + 5;
    doc
      .fontSize(8)
      .fillColor("#fff")
      .rect(40, y, 515, 20)
      .fill("#0a1a44")
      .fillColor("#fff");
    let x = 45;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });
    y += 22;

    // 🧩 داده‌ها با استایل برند و ردیف‌های راه‌راه
    result.rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? "#f7f9fb" : "#fff";
      doc.fillColor(bg).rect(40, y, 515, 20).fill();
      doc.fillColor("#000").fontSize(7);

      const row = [
        r.email || "—",
        r.ip_address || "—",
        r.success ? "✅ Success" : "❌ Failed",
        r.user_agent
          ? r.user_agent.slice(0, 80) + (r.user_agent.length > 80 ? "..." : "")
          : "—",
        r.created_at ? new Date(r.created_at).toLocaleString() : "—",
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
    console.error("❌ exportLoginAttemptsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
