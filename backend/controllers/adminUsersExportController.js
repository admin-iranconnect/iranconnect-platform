// backend/controllers/adminUsersExportController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────────── 📤 Export Users to XLSX ───────────── */
export async function exportUsersXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM users
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Users");

    // داینامیک ساختن ستون‌ها بر اساس جدول
    const columns = Object.keys(result.rows[0] || {}).map((key) => ({
      header: key.toUpperCase(),
      key,
      width: 22,
    }));
    sheet.columns = columns;

    // 🎨 استایل هدر مشابه ایران‌کانکت
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0A1A44" }, // رنگ سرمه‌ای تیره ایران‌کانکت
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF00BFA6" } },
        bottom: { style: "thin", color: { argb: "FF00BFA6" } },
      };
    });

    // 🧩 ردیف‌ها
    result.rows.forEach((r) => {
      sheet.addRow(r);
    });

    // 📦 خروجی
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_Users_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportUsersXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 🧾 Export Users to PDF ───────────── */
export async function exportUsersPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        email,
        role,
        is_verified,
        is_blocked,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_Users_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 🖼️ لوگو در بالای صفحه
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
      .text("Users Report", { align: "center" });
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(0.5);

    const headers = ["Email", "Role", "Verified", "Blocked", "Created"];
    const colWidths = [180, 70, 70, 70, 100];

    let y = doc.y + 5;
    doc.fontSize(8).fillColor("#fff").rect(40, y, 515, 20).fill("#0a1a44").fillColor("#fff");
    let x = 45;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5, { width: colWidths[i], align: "center" });
      x += colWidths[i];
    });
    y += 22;

    result.rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? "#f7f9fb" : "#fff";
      doc.fillColor(bg).rect(40, y, 515, 20).fill();
      doc.fillColor("#000").fontSize(8);

      const row = [
        r.email || "—",
        r.role || "—",
        r.is_verified === null ? "null" : r.is_verified.toString(),
        r.is_blocked === null ? "null" : r.is_blocked.toString(),
        r.created_at ? new Date(r.created_at).toLocaleString() : "—",
      ];  
      let cellX = 45;
      row.forEach((c, i) => {
        doc.text(c, cellX, y + 6, { width: colWidths[i], align: "center" });
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
    console.error("❌ exportUsersPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
