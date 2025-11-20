// backend/controllers/adminFileLogsExportController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────────── 📤 Export File Logs to XLSX ───────────── */
export async function exportFileLogsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        f.file_name,
        f.mime_type,
        f.file_size,
        f.scan_status,
        f.upload_source,
        f.ip_address,
        f.scanned_at,
        u.email AS user_email
      FROM file_scan_logs f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.scanned_at DESC
      LIMIT 1000
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("File Logs");

    sheet.columns = [
      { header: "FILE NAME", key: "file_name", width: 25 },
      { header: "MIME TYPE", key: "mime_type", width: 20 },
      { header: "SIZE (KB)", key: "file_size", width: 15 },
      { header: "STATUS", key: "scan_status", width: 15 },
      { header: "SOURCE", key: "upload_source", width: 20 },
      { header: "USER EMAIL", key: "user_email", width: 25 },
      { header: "IP ADDRESS", key: "ip_address", width: 20 },
      { header: "SCANNED AT", key: "scanned_at", width: 25 },
    ];

    // 🎨 استایل هدر مطابق ایران‌کانکت
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
        ...r,
        file_size: r.file_size ? (r.file_size / 1024).toFixed(1) : "—",
        scanned_at: r.scanned_at
          ? new Date(r.scanned_at).toLocaleString()
          : "—",
      });
    });

    // 📦 خروجی
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_FileLogs_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportFileLogsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
/* ───────────── 🧾 Export File Logs to PDF ───────────── */
export async function exportFileLogsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        f.file_name,
        f.mime_type,
        f.file_size,
        f.scan_status,
        f.upload_source,
        u.email AS user_email,
        f.scanned_at
      FROM file_scan_logs f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.scanned_at DESC
      LIMIT 1000
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_FileLogs_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 🖼️ لوگو
    const logoPath = path.join(__dirname, "../../frontend/public/logo-light.png");
    if (fs.existsSync(logoPath)) {
      const logoWidth = 90;
      const logoX = (doc.page.width - logoWidth) / 2;
      doc.image(logoPath, logoX, 40, { width: logoWidth });
      doc.moveDown(6);
    }

    // عنوان و تاریخ
    doc
      .fontSize(10)
      .fillColor("#0a1a44")
      .text("File Upload Logs Report", { align: "center" });
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(9)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(0.5);

    const headers = [
      "File Name",
      "Status",
      "Source",
      "User",
      "Size (KB)",
      "Date",
    ];
    const colWidths = [130, 60, 70, 100, 60, 90];

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

    result.rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? "#f7f9fb" : "#fff";
      doc.fillColor(bg).rect(40, y, 515, 20).fill();
      doc.fillColor("#000").fontSize(7);

      const row = [
        r.file_name || "—",
        r.scan_status || "—",
        r.upload_source || "—",
        r.user_email || "—",
        r.file_size ? (r.file_size / 1024).toFixed(1) : "—",
        r.scanned_at ? new Date(r.scanned_at).toLocaleString() : "—",
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
    console.error("❌ exportFileLogsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
