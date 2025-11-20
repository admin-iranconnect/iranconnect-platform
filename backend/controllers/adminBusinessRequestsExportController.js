// backend/controllers/adminBusinessRequestsExportController.js
import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ───────────── 📤 خروجی XLSX ───────────── */
export async function exportRequestsXLSX(req, res) {
  try {
    const { status, type } = req.query;

    const params = [];
    let where = "WHERE br.request_type IN ('new','update','delete')";
    if (status) {
      params.push(status);
      where += ` AND br.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      where += ` AND br.request_type = $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT 
        br.id,
        b.name AS business_name,
        u.email AS user_email,
        br.request_type,
        br.status,
        br.ticket_code,
        br.created_at,
        br.processed_at,
        br.admin_note,
        br.payload,
        br.attachments
      FROM business_requests br
      LEFT JOIN businesses b ON br.business_id = b.id
      LEFT JOIN users u ON u.id = br.user_id
      ${where}
      ORDER BY br.created_at DESC
      LIMIT 500
      `,
      params
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Business Requests");

    sheet.columns = [
      { header: "Business", key: "business_name", width: 25 },
      { header: "User Email", key: "user_email", width: 30 },
      { header: "Type", key: "request_type", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Ticket", key: "ticket_code", width: 20 },
      { header: "Created", key: "created_at", width: 22 },
      { header: "Processed", key: "processed_at", width: 22 },
      { header: "Admin Note", key: "admin_note", width: 35 },
      { header: "Form Data (Payload)", key: "payload", width: 50 },
      { header: "Attachments", key: "attachments", width: 45 },
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

    // 🧩 پردازش و تبدیل داده‌ها به متن خوانا
    result.rows.forEach((r) => {
      // ✅ Payload
      try {
        const data = JSON.parse(r.payload || "{}");
        r.payload = Object.entries(data)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
      } catch {
        r.payload = "";
      }

      // ✅ Attachments
      try {
        const filesRaw = r.attachments;
        const files = typeof filesRaw === "string" ? JSON.parse(filesRaw) : filesRaw;
        if (Array.isArray(files) && files.length > 0) {
          r.attachments = files.map((f) => f.filename).join(", ");
        } else {
          r.attachments = "—";
        }
      } catch (err) {
        console.error("⚠️ Attachment parse error:", err.message);
        r.attachments = "—";
      }

      // اضافه کردن ردیف نهایی
      sheet.addRow(r);
    });

    // 📦 تنظیمات خروجی
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_Requests_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportRequestsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ───────────── 🧾 خروجی PDF ───────────── */
export async function exportRequestsPDF(req, res) {
  try {
    const { status, type } = req.query;

    const params = [];
    let where = "WHERE br.request_type IN ('new','update','delete')";
    if (status) {
      params.push(status);
      where += ` AND br.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      where += ` AND br.request_type = $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT 
        b.name AS business_name,
        u.email AS user_email,
        br.request_type,
        br.status,
        br.ticket_code,
        br.created_at,
        br.processed_at,
        br.admin_note
      FROM business_requests br
      LEFT JOIN businesses b ON br.business_id = b.id
      LEFT JOIN users u ON u.id = br.user_id
      ${where}
      ORDER BY br.created_at DESC
      LIMIT 500
      `,
      params
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_Requests_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

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
      .text("Business Requests Report", { align: "center" });
    doc
      .moveUp(1)
      .moveDown(1)
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(0.5);

    const headers = [
      "Business",
      "User Email",
      "Type",
      "Status",
      "Ticket",
      "Created",
      "Processed",
    ];
    const colWidths = [90, 100, 50, 55, 65, 80, 80];

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
      doc.fillColor("#000").fontSize(7);

      const row = [
        r.business_name || "—",
        r.user_email || "—",
        r.request_type || "—",
        r.status || "—",
        r.ticket_code || "—",
        r.created_at ? new Date(r.created_at).toLocaleString() : "—",
        r.processed_at ? new Date(r.processed_at).toLocaleString() : "—",
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
    console.error("❌ exportRequestsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
