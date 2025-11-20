import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import pool from "../db.js";
import { fileURLToPath } from "url";

const tempDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🧾 تولید گزارش PDF برای Bulk Email
 */
export async function generateBulkEmailPDF(bulkId) {
  const { rows: [log] } = await pool.query(
    "SELECT * FROM bulk_email_logs WHERE id = $1",
    [bulkId]
  );
  const { rows: recipients } = await pool.query(
    "SELECT * FROM bulk_email_recipients WHERE bulk_id = $1",
    [bulkId]
  );

  // ✅ محاسبه‌ی شناسه استاندارد
  const bulkCode = log.bulk_code || `BID-${String(bulkId).padStart(6, "0")}`;

  const filePath = path.join(tempDir, `bulk_email_report_${bulkCode}.pdf`);
  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

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

  // ✅ عنوان و شناسه جدید BID-XXXXXX
  doc
    .moveUp(0.2)
    .moveDown(1)
    .fontSize(12)
    .fillColor("#0a1a44")
    .text("Bulk Email Report", { align: "center" });

  doc
    .moveUp(1)
    .moveDown(1)
    .fontSize(10)
    .fillColor("#666666")
    .text(`Bulk Code: ${bulkCode}`, { align: "center" });
  doc.moveDown(0.3);

  const now = new Date();
  const formattedDate = now.toLocaleString();
  doc
    .moveDown(0.3)
    .fontSize(10)
    .fillColor("#666666")
    .text(`Generated on: ${formattedDate}`, { align: "center" });

  doc.moveDown(1);

  // 🟦 جزئیات ایمیل
  doc
    .fontSize(10)
    .fillColor("#000000")
    .text(`Sender: ${log.sender_email}`)
    .text(`Subject: ${log.subject}`)
    .text(`Body: ${log.body.replace(/<[^>]*>?/gm, "").slice(0, 500)}...`)
    .moveDown(1);

  // 🟦 جدول گیرندگان
  let startY = doc.y + 10;
  doc
    .fontSize(8)
    .fillColor("#FFFFFF")
    .rect(40, startY, 515, 22)
    .fill("#0a1a44")
    .fillColor("#FFFFFF")
    .text("Recipient Email", 50, startY + 7)
    .text("Status", 280, startY + 7)
    .text("Sent At", 400, startY + 7);
  doc.moveTo(40, startY + 22).stroke();

  doc.fillColor("#000000");
  let y = startY + 30;
  for (const r of recipients) {
    doc.text(r.recipient_email, 50, y);
    doc.text(r.status, 280, y);
    doc.text(new Date(r.sent_at).toLocaleString(), 400, y);
    y += 20;
  }

  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));
  return filePath;
}

/**
 * 📊 تولید گزارش XLSX
 */
export async function generateBulkEmailXLSX(bulkId) {
  const { rows: [log] } = await pool.query(
    "SELECT * FROM bulk_email_logs WHERE id = $1",
    [bulkId]
  );
  const { rows: recipients } = await pool.query(
    "SELECT * FROM bulk_email_recipients WHERE bulk_id = $1",
    [bulkId]
  );

  const bulkCode = log.bulk_code || `BID-${String(bulkId).padStart(6, "0")}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bulk Email Report");

  sheet.addRow(["Bulk Code", bulkCode]);
  sheet.addRow(["Sender Email", log.sender_email]);
  sheet.addRow(["Subject", log.subject]);
  sheet.addRow(["Body", log.body]);
  sheet.addRow(["Generated On", new Date().toLocaleString()]);
  sheet.addRow([]);

  // 🟩 جدول گیرندگان
  sheet.addRow(["Recipient Email", "Status", "Sent At"]);
  recipients.forEach((r) =>
    sheet.addRow([
      r.recipient_email,
      r.status,
      new Date(r.sent_at).toLocaleString(),
    ])
  );

  const filePath = path.join(tempDir, `bulk_email_report_${bulkCode}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
