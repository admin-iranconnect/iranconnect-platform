// backend/controllers/adminConsentsController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────────── 📋 لیست تمام رضایت‌ها (Consents) ───────────── */
export async function listConsents(req, res) {
  try {
    const result = await pool.query(`
      SELECT c.id, u.email, c.consent_type, c.version, c.choice,
             c.ip_address, c.user_agent, c.created_at
      FROM user_consents c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ listConsents error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 📤 خروجی Excel ───────────── */
export async function exportConsentsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT u.email, c.consent_type, c.version, c.choice, c.ip_address, c.created_at
      FROM user_consents c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC;
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("User Consents");

    // 🎨 ستون‌ها
    sheet.columns = [
      { header: "User Email", key: "email", width: 30 },
      { header: "Consent Type", key: "consent_type", width: 20 },
      { header: "Version", key: "version", width: 10 },
      { header: "Choice", key: "choice", width: 12 },
      { header: "IP Address", key: "ip_address", width: 18 },
      { header: "Created At", key: "created_at", width: 25 },
    ];

    // 🎨 استایل هدر
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
      "attachment; filename=IranConnect_User_Consents.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportConsentsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 🧾 خروجی PDF ───────────── */
export async function exportConsentsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT u.email, c.consent_type, c.version, c.choice, c.ip_address, c.created_at
      FROM user_consents c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC;
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_User_Consents_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const logoPath = path.join(__dirname, "../../frontend/public/logo-light.png");
    const pageWidth = doc.page.width;
    let yPos = 50;

    // ✅ لوگو در مرکز بالا
    if (fs.existsSync(logoPath)) {
      const logoWidth = 90;
      const logoHeight = 90;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.image(logoPath, logoX, yPos, { width: logoWidth });
      yPos += logoHeight + 10;
      doc.moveDown(6);
    }

    // ✅ عنوان و تاریخ
    doc
      .fontSize(12)
      .fillColor("#0a1a44")
      .text("User Consents Report", { align: "center" });

    const now = new Date();
    const formattedDate = now.toLocaleString();
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(10)
      .fillColor("#666666")
      .text(`Generated on: ${formattedDate}`, { align: "center" });

    doc.moveDown(0.5);

    // جدول
    const startY = doc.y + 5;
    const headers = [
      "User Email",
      "Consent Type",
      "Version",
      "Choice",
      "IP Address",
      "Created At",
    ];
    const colWidths = [130, 70, 40, 45, 80, 100];

    // 🟦 هدر جدول
    doc
      .fontSize(8)
      .fillColor("#FFFFFF")
      .rect(40, startY, 515, 22)
      .fill("#0a1a44")
      .fillColor("#FFFFFF");

    let x = 45;
    headers.forEach((h, i) => {
      doc.text(h, x, startY + 6, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    // 🧾 داده‌ها
    let y = startY + 22;
    result.rows.forEach((r, idx) => {
      const isEven = idx % 2 === 0;
      const bgColor = isEven ? "#f7f9fb" : "#ffffff";

      doc.fillColor(bgColor).rect(40, y, 515, 22).fill();
      doc.fillColor("#000000").fontSize(7);

      const row = [
        r.email || "—",
        r.consent_type || "—",
        r.version || "—",
        r.choice || "—",
        r.ip_address || "—",
        r.created_at ? new Date(r.created_at).toLocaleString() : "—",
      ];

      let cellX = 45;
      row.forEach((cell, i) => {
        doc.text(cell, cellX, y + 6, { width: colWidths[i], align: "left" });
        cellX += colWidths[i];
      });

      y += 22;
      doc
        .moveTo(40, y)
        .lineTo(555, y)
        .strokeColor("#00bfa6")
        .lineWidth(0.3)
        .stroke();

      // صفحه جدید در صورت پر شدن
      if (y > 750) {
        doc.addPage();
        y = 60;
      }
    });

    doc.end();
  } catch (err) {
    console.error("❌ exportConsentsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
