// backend/utils/virusScanner.js
import NodeClam from "clamscan";
import fs from "fs/promises";
import path from "path";
import db from "../db.js";

// ──────────────── 🔹 Init ClamAV Connection ────────────────
let clamInstance = null;

async function initClamAV() {
  if (clamInstance) return clamInstance;

  const clamscan = await new NodeClam().init({
    removeInfected: false,
    quarantineInfected: false,
    scanLog: null,
    clamdscan: {
      host: process.env.CLAMD_HOST || "127.0.0.1",
      port: process.env.CLAMD_PORT || 3310,
      timeout: 60000,
      socket: false,
    },
  });

  clamInstance = clamscan;
  return clamInstance;
}

// ──────────────── 🔹 Log Scan Result to Database ────────────────
async function logScan({
  userId,
  fileName,
  mimeType,
  fileSize,
  result,
  ip,
  duration,
}) {
  try {
    await db.query(
      `INSERT INTO file_scan_logs 
       (user_id, file_name, mime_type, file_size, scan_status, viruses, ip_address, clamd_version, duration_ms, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        userId || null,
        fileName || "unknown",
        mimeType || null,
        fileSize || 0,
        result.infected ? "infected" : result.error ? "error" : "clean",
        result.viruses?.length ? result.viruses : [],
        ip || null,
        process.env.CLAMD_VERSION || "ClamAV Node Client",
        duration || 0,
        result.error || null,
      ]
    );
  } catch (err) {
    console.error("⚠️ Failed to log scan:", err.message);
  }
}

// ──────────────── 🔹 Scan a File Buffer ────────────────
export async function scanBuffer(buffer, meta = {}) {
  const tmpPath = path.join("/tmp", `scan_${Date.now()}.bin`);
  const start = Date.now();

  try {
    await fs.writeFile(tmpPath, buffer);
    const clamd = await initClamAV();

    const { isInfected, viruses } = await clamd.scanFile(tmpPath);
    const duration = Date.now() - start;

    const result = { infected: !!isInfected, viruses: viruses || [] };

    // ✅ Log in DB
    await logScan({
      userId: meta.userId,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      ip: meta.ip,
      duration,
      result,
    });

    await fs.unlink(tmpPath);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error("⚠️ Virus scan error:", err.message);

    // ❗ Log error as 'error' status
    await logScan({
      userId: meta.userId,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      ip: meta.ip,
      duration,
      result: { infected: false, error: err.message },
    });

    return { infected: false, error: err.message };
  }
}
