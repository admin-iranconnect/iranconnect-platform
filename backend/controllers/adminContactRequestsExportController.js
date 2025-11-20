// backend/controllers/adminContactRequestsExportController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────────── 📤 Export Contact Requests to XLSX ───────────── */
export async function exportContactRequestsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        user_id,
        name,
        email,
        subject_type,
        custom_subject,
        message,
        ip_address,
        recaptcha_verified,
        has_profile,
        status,
        created_at,
        handled_by,
        admin_note,
        handled_at
      FROM contact_requests
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Contact Requests");

    const columns = Object.keys(result.rows[0] || {}).map((key) => ({
      header: key.toUpperCase(),
      key,
      width: 25,
    }));
    sheet.columns = columns;

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

    result.rows.forEach((r) => {
      sheet.addRow(r);
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_ContactRequests_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportContactRequestsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 🧾 Export Contact Requests to PDF ───────────── */
export async function exportContactRequestsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        name,
        email,
        subject_type,
        status,
        created_at
      FROM contact_requests
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_ContactRequests_Report.pdf"
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

    doc
      .fontSize(10)
      .fillColor("#0a1a44")
      .text("Contact Requests Report", { align: "center" });
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    const headers = ["Name", "Email", "Subject", "Status", "Created"];
    const colWidths = [118, 160, 100, 45, 90];

    let y = doc.y + 5;
    doc
      .fontSize(8)
      .fillColor("#fff")
      .rect(40, y, 515, 20)
      .fill("#0a1a44")
      .fillColor("#fff");
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
        r.name || "—",
        r.email || "—",
        r.subject_type || "—",
        r.status || "—",
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
    console.error("❌ exportContactRequestsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
