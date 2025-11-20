// backend/controllers/adminBlockedIPsExportController.js

import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ============================================================
   📤 Export Blocked IPs → Excel (FULL COLUMNS)
============================================================ */
export async function exportBlockedIPsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.ip_address,
        b.status,
        b.reason AS block_reason,
        b.blocked_by,
        b.blocked_at,
        b.automatic,
        b.unblocked_by,
        b.unblocked_reason,
        b.unblocked_at,

        s.suspicious_type,
        s.severity_level,
        s.count_attempts,
        s.first_seen,
        s.last_seen,

        u1.email AS blocked_by_email,
        u2.email AS unblocked_by_email

      FROM blocked_ips b
      LEFT JOIN suspicious_ips s
        ON b.ip_address = s.ip_address
      LEFT JOIN users u1
        ON b.blocked_by = u1.id
      LEFT JOIN users u2
        ON b.unblocked_by = u2.id
      ORDER BY b.blocked_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Blocked IPs");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "IP ADDRESS", key: "ip_address", width: 20 },
      { header: "STATUS", key: "status", width: 12 },
      { header: "BLOCK REASON", key: "block_reason", width: 35 },
      { header: "BLOCKED BY (ID)", key: "blocked_by", width: 15 },
      { header: "BLOCKED BY (EMAIL)", key: "blocked_by_email", width: 25 },
      { header: "BLOCKED AT", key: "blocked_at", width: 25 },
      { header: "AUTOMATIC", key: "automatic", width: 12 },
      { header: "UNBLOCKED BY (ID)", key: "unblocked_by", width: 18 },
      { header: "UNBLOCKED BY (EMAIL)", key: "unblocked_by_email", width: 25 },
      { header: "UNBLOCK REASON", key: "unblocked_reason", width: 35 },
      { header: "UNBLOCKED AT", key: "unblocked_at", width: 25 },

      // Suspicious columns
      { header: "SUSPICIOUS TYPE", key: "suspicious_type", width: 20 },
      { header: "SEVERITY", key: "severity_level", width: 12 },
      { header: "ATTEMPTS", key: "count_attempts", width: 12 },
      { header: "FIRST SEEN", key: "first_seen", width: 25 },
      { header: "LAST SEEN", key: "last_seen", width: 25 },
    ];

    // header style (same as Suspicious)
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

    // rows
    result.rows.forEach((r) => {
      sheet.addRow({
        ...r,
        blocked_at: r.blocked_at ? new Date(r.blocked_at).toLocaleString() : "—",
        unblocked_at: r.unblocked_at ? new Date(r.unblocked_at).toLocaleString() : "—",
        first_seen: r.first_seen ? new Date(r.first_seen).toLocaleString() : "—",
        last_seen: r.last_seen ? new Date(r.last_seen).toLocaleString() : "—",
        automatic: r.automatic ? "Yes" : "No",
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_BlockedIPs_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ exportBlockedIPsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ============================================================
   🧾 Export Blocked IPs → PDF (Same as Suspicious Style)
============================================================ */
export async function exportBlockedIPsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        b.ip_address,
        s.suspicious_type,
        s.severity_level,
        s.count_attempts,
        s.last_seen,
        s.first_seen,
        b.status
      FROM blocked_ips b
      LEFT JOIN suspicious_ips s
        ON b.ip_address = s.ip_address
      ORDER BY b.blocked_at DESC
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_BlockedIPs_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // logo
    const logoPath = path.join(__dirname, "../../frontend/public/logo-light.png");
    if (fs.existsSync(logoPath)) {
      const w = 90;
      const x = (doc.page.width - w) / 2;
      doc.image(logoPath, x, 40, { width: w });
      doc.moveDown(6);
    }

    doc.fontSize(10).fillColor("#0a1a44")
      .text("Blocked IPs Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(1);

    const headers = [
      "IP Address",
      "Type",
      "Severity",
      "Attempts",
      "Last Seen",
      "First Seen",
      "Status",
    ];

    const widths = [90, 70, 60, 50, 100, 100, 80];
    let y = doc.y + 5;

    doc.rect(40, y, 515, 20).fill("#0a1a44");
    doc.fillColor("#fff").fontSize(8);

    let x = 45;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 6, { width: widths[i] });
      x += widths[i];
    });

    y += 22;

    result.rows.forEach((r, i) => {
      const bg = i % 2 === 0 ? "#f7f9fb" : "#fff";
      doc.fillColor(bg).rect(40, y, 515, 20).fill();

      doc.fillColor("#000").fontSize(7);

      const row = [
        r.ip_address,
        r.suspicious_type || "—",
        r.severity_level || "—",
        r.count_attempts || "0",
        r.first_seen ? new Date(r.first_seen).toLocaleString() : "—",
        r.last_seen ? new Date(r.last_seen).toLocaleString() : "—",
        r.status || "blocked",
      ];

      let cx = 45;
      row.forEach((c, i) => {
        doc.text(c, cx, y + 6, { width: widths[i] });
        cx += widths[i];
      });

      y += 20;

      if (y > 750) {
        doc.addPage();
        y = 60;
      }
    });

    doc.end();
  } catch (err) {
    console.error("❌ exportBlockedIPsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
