// backend/controllers/adminLoginAttemptsController.js
import db from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* =========================================================
   🧩 Get latest 10 login attempts (with filters)
   ========================================================= */
export async function getAllLoginAttempts(req, res) {
  try {
    const { status, email, blocked } = req.query;
    const filters = [];
    const values = [];

    if (status) {
      filters.push(`success = $${filters.length + 1}`);
      values.push(status === "success");
    }
    if (email) {
      filters.push(`LOWER(email) LIKE $${filters.length + 1}`);
      values.push(`%${email.toLowerCase()}%`);
    }
    if (blocked === "true") {
      filters.push(`email IN (
        SELECT email FROM users WHERE is_blocked = true
      )`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT id, email, ip_address, success, user_agent, created_at
      FROM login_attempts
      ${where}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const { rows } = await db.query(query, values);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ getAllLoginAttempts error:", err);
    res.status(500).json({ error: "Server error fetching login attempts" });
  }
}

/* =========================================================
   🧾 Get single login attempt details
   ========================================================= */
export async function getLoginAttemptDetails(req, res) {
  try {
    const id = req.params.id;
    const { rows } = await db.query(
      `SELECT * FROM login_attempts WHERE id = $1`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Log not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ getLoginAttemptDetails error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

/* =========================================================
   📊 Export login attempts to Excel
   ========================================================= */
export async function exportLoginAttemptsExcel(req, res) {
  try {
    const result = await db.query(`
      SELECT email, ip_address, user_agent, success, created_at
      FROM login_attempts
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Login Logs");

    sheet.columns = [
      { header: "EMAIL", key: "email", width: 25 },
      { header: "IP ADDRESS", key: "ip_address", width: 20 },
      { header: "STATUS", key: "success", width: 15 },
      { header: "DEVICE", key: "user_agent", width: 40 },
      { header: "DATE", key: "created_at", width: 25 },
    ];

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
      sheet.addRow({
        email: r.email || "—",
        ip_address: r.ip_address || "—",
        success: r.success ? "Success" : "Failed",
        user_agent: r.user_agent ? r.user_agent.slice(0, 50) + "..." : "—",
        created_at: new Date(r.created_at).toLocaleString(),
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_LoginLogs.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportLoginAttemptsExcel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* =========================================================
   🧾 Export login attempts to PDF
   ========================================================= */
export async function exportLoginAttemptsPDF(req, res) {
  try {
    const result = await db.query(`
      SELECT email, ip_address, user_agent, success, created_at
      FROM login_attempts
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_LoginLogs.pdf"
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
      .text("User Login Attempts Report", { align: "center" });
    doc
      .moveDown(0.5)
      .fontSize(9)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(1);

    const headers = ["Email", "IP", "Status", "Device", "Date"];
    const colWidths = [140, 70, 60, 150, 100];
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
        r.email || "—",
        r.ip_address || "—",
        r.success ? "✅ Success" : "❌ Failed",
        r.user_agent ? r.user_agent.slice(0, 50) + "..." : "—",
        new Date(r.created_at).toLocaleString(),
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
