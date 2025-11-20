// backend/controllers/adminSuspiciousIPsExportController.js

import pool from "../db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ────────────────────────────────
   📤 Export Suspicious IPs → Excel
──────────────────────────────── */
export async function exportSuspiciousIPsXLSX(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.ip_address,
        s.suspicious_type,
        s.severity_level,
        s.count_attempts,
        s.first_seen,
        s.last_seen,
        s.resolved,
        s.resolved_at,
        s.resolved_by,
        b.status AS block_status,
        b.reason AS block_reason,
        b.blocked_by,
        b.blocked_at,
        b.unblocked_by,
        b.unblocked_reason,
        b.unblocked_at
      FROM suspicious_ips s
      LEFT JOIN blocked_ips b
        ON s.ip_address = b.ip_address
      ORDER BY s.last_seen DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Suspicious IPs");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "IP ADDRESS", key: "ip_address", width: 20 },
      { header: "TYPE", key: "suspicious_type", width: 20 },
      { header: "SEVERITY", key: "severity_level", width: 12 },
      { header: "ATTEMPTS", key: "count_attempts", width: 12 },
      { header: "FIRST SEEN", key: "first_seen", width: 25 },
      { header: "LAST SEEN", key: "last_seen", width: 25 },
      { header: "RESOLVED", key: "resolved", width: 12 },
      { header: "RESOLVED AT", key: "resolved_at", width: 25 },
      { header: "RESOLVED BY", key: "resolved_by", width: 20 },
      { header: "BLOCK STATUS", key: "block_status", width: 15 },
      { header: "BLOCK REASON", key: "block_reason", width: 35 },
      { header: "BLOCKED BY", key: "blocked_by", width: 15 },
      { header: "BLOCKED AT", key: "blocked_at", width: 25 },
      { header: "UNBLOCKED BY", key: "unblocked_by", width: 15 },
      { header: "UNBLOCK REASON", key: "unblocked_reason", width: 35 },
      { header: "UNBLOCKED AT", key: "unblocked_at", width: 25 },
    ];

    // Header style
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
        id: r.id,
        ip_address: r.ip_address,
        suspicious_type: r.suspicious_type,
        severity_level: r.severity_level,
        count_attempts: r.count_attempts,
        first_seen: r.first_seen ? new Date(r.first_seen).toLocaleString() : "—",
        last_seen: r.last_seen ? new Date(r.last_seen).toLocaleString() : "—",
        resolved: r.resolved ? "Yes" : "No",
        resolved_at: r.resolved_at ? new Date(r.resolved_at).toLocaleString() : "—",
        resolved_by: r.resolved_by || "—",
        block_status: r.block_status || "not_blocked",
        block_reason: r.block_reason || "—",
        blocked_by: r.blocked_by || "—",
        blocked_at: r.blocked_at ? new Date(r.blocked_at).toLocaleString() : "—",
        unblocked_by: r.unblocked_by || "—",
        unblocked_reason: r.unblocked_reason || "—",
        unblocked_at: r.unblocked_at ? new Date(r.unblocked_at).toLocaleString() : "—",
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_SuspiciousIPs_Report.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ exportSuspiciousIPsXLSX error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


/* ────────────────────────────────
   🧾 Export Suspicious IPs → PDF
──────────────────────────────── */
export async function exportSuspiciousIPsPDF(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        s.*, 
        b.status AS block_status,
        b.reason AS block_reason,
        b.blocked_by,
        b.blocked_at,
        b.unblocked_by,
        b.unblocked_reason,
        b.unblocked_at
      FROM suspicious_ips s
      LEFT JOIN blocked_ips b
        ON s.ip_address = b.ip_address
      ORDER BY s.first_seen, s.last_seen DESC
    `);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=IranConnect_SuspiciousIPs_Report.pdf"
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 🖼️ لوگو بالا
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
      .text("Suspicious IPs Report", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(1);

    /* جدول PDF - فقط ستون‌های اصلی برای خوانایی */
    const headers = [
      "IP Address",
      "Type",
      "Severity",
      "Attempts",
      "First_Seen",
      "Last Seen",
      "Status",
    ];

    const colWidths = [90, 70, 60, 50, 100, 100, 80];

    let y = doc.y + 5;

    // header row
    doc.rect(40, y, 515, 20).fill("#0a1a44");
    doc.fillColor("#fff").fontSize(8);

    let x = 45;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 6, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    y += 22;

    result.rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? "#f7f9fb" : "#fff";
      doc.fillColor(bg).rect(40, y, 515, 20).fill();

      doc.fillColor("#000").fontSize(7);

      const row = [
        r.ip_address,
        r.suspicious_type,
        r.severity_level,
        r.count_attempts,
        r.first_seen ? new Date(r.first_seen).toLocaleString() : "—",
        r.last_seen ? new Date(r.last_seen).toLocaleString() : "—",
        r.block_status || "not_blocked",
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
    console.error("❌ exportSuspiciousIPsPDF error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
