// backend/utils/suspiciousDetector.js
import db from "../db.js";

// 🧠 پیکربندی رفتار مشکوک
const config = {
  brute_force: {
    threshold_warn: 5,     // هشدار بعد از 5 تلاش ناموفق در 10 دقیقه
    threshold_block: 9,    // بلاک بعد از 9 تلاش ناموفق در 10 دقیقه
    block_message: "Blocked due to excessive failed login attempts (brute force).",
    severity: "high",
  },
  // سایر رفتارها قابل افزودن هستند
};

export async function monitorSuspiciousIP({ ip, email, userAgent, type = "brute_force" }) {
  try {
    if (!ip) return;

    const rule = config[type];
    if (!rule) return;

    // 🕒 بررسی تعداد تلاش‌های اخیر در 10 دقیقه گذشته
    const { rows } = await db.query(
      `SELECT COUNT(*) AS count, 
              MIN(created_at) AS first_seen, 
              MAX(created_at) AS last_seen 
       FROM login_attempts
       WHERE ip_address = $1 AND success = false AND created_at > NOW() - interval '10 minutes'`,
      [ip]
    );

    const count = parseInt(rows[0]?.count || 0, 10);
    const firstSeen = rows[0]?.first_seen;
    const lastSeen = rows[0]?.last_seen;

    // 🔶 فقط هشدار اولیه (قابل استفاده برای کند کردن)
    if (count >= rule.threshold_warn && count < rule.threshold_block) {
      console.warn(`⚠️ Suspicious activity (${type}) from IP ${ip} (${count} failed logins)`);
    }

    // 🚨 اضافه به جدول suspicious_ips
    if (count >= rule.threshold_block) {
      const suspiciousExists = await db.query(
        `SELECT id FROM suspicious_ips WHERE ip_address = $1 AND suspicious_type = $2 AND resolved = false`,
        [ip, type]
      );

      if (!suspiciousExists.rowCount) {
        await db.query(
          `INSERT INTO suspicious_ips (ip_address, suspicious_type, severity_level, count_attempts, first_seen, last_seen)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [ip, type, rule.severity, count, firstSeen, lastSeen]
        );

        console.log(`🟠 Logged suspicious IP: ${ip} (${type})`);
      }
    }

    // 🚫 بلاک خودکار IP پس از حد مشخص
    if (count >= 15) {
      const blockExists = await db.query(
        `SELECT id FROM blocked_ips WHERE ip_address = $1 AND status = 'blocked'`,
        [ip]
      );

      if (!blockExists.rowCount) {
        await db.query(
          `INSERT INTO blocked_ips (ip_address, reason, suspicious_type, severity_level, automatic)
           VALUES ($1,$2,$3,$4,true)`,
          [ip, rule.block_message, type, rule.severity]
        );
        console.warn(`🚫 IP ${ip} automatically blocked for suspicious activity (${type})`);
      }
    }
  } catch (err) {
    console.error("monitorSuspiciousIP error:", err);
  }
}