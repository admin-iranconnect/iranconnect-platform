// backend/middleware/suspiciousDetector.js

import db from "../db.js";

/**
 * 💡 رفتارهای پشتیبانی‌شده:
 * - brute_force
 * - 404_scan
 * - sensitive_path
 * - payload_injection
 * - burst
 * - user_agent_anomaly
 */

export async function monitorSuspiciousIP(req, type) {
  const ip = req.ip;
  const ua = req.headers["user-agent"] || "";
  const path = req.originalUrl || req.url || "";
  const method = req.method;

  const now = new Date();
  let threshold, windowMs;
  let severity = "low";

  // تنظیم آستانه‌ها برای هر نوع رفتار
  switch (type) {
    case "brute_force":
      threshold = 9;
      windowMs = 10 * 60 * 1000;
      severity = "high";
      break;

    case "404_scan":
      threshold = 15;
      windowMs = 5 * 60 * 1000;
      break;

    case "sensitive_path":
      threshold = 3;
      windowMs = 10 * 60 * 1000;
      severity = "medium";
      break;

    case "payload_injection":
      threshold = 2;
      windowMs = 5 * 60 * 1000;
      severity = "critical";
      break;

    case "burst":
      threshold = 30;
      windowMs = 10 * 1000;
      severity = "medium";
      break;

    case "user_agent_anomaly":
      threshold = 1;
      windowMs = 1 * 60 * 1000;
      severity = "high";
      break;

    default:
      return; // ناشناخته یا غیرمجاز
  }

  // بررسی وجود رکورد فعال برای این IP و نوع رفتار
  const { rows } = await db.query(
    `SELECT * FROM suspicious_ips
     WHERE ip_address=$1 AND suspicious_type=$2
       AND last_seen >= NOW() - INTERVAL '1 second' * $3
       AND resolved=false
     ORDER BY last_seen DESC LIMIT 1`,
    [ip, type, windowMs / 1000]
  );

  if (rows.length) {
    // به‌روزرسانی شمارش
    await db.query(
      `UPDATE suspicious_ips
       SET count_attempts = count_attempts + 1,
           last_seen = NOW()
       WHERE id=$1`,
      [rows[0].id]
    );

    const total = rows[0].count_attempts + 1;

    // بلاک خودکار اگر از آستانه گذشت
    if (total >= threshold) {
      const alreadyBlocked = await db.query(
        `SELECT 1 FROM blocked_ips WHERE ip_address=$1 AND status='blocked'`,
        [ip]
      );
      if (!alreadyBlocked.rowCount) {
        await db.query(
          `INSERT INTO blocked_ips
           (ip_address, reason, status, suspicious_type, severity_level, automatic)
           VALUES ($1,$2,'blocked',$3,$4,true)`,
          [ip, `Auto-blocked for ${type} detection`, type, severity]
        );
      }
    }
  } else {
    // ایجاد رکورد جدید
    await db.query(
      `INSERT INTO suspicious_ips
         (ip_address, suspicious_type, severity_level, count_attempts, first_seen, last_seen)
       VALUES ($1,$2,$3,1,NOW(),NOW())`,
      [ip, type, severity]
    );
  }

  // اگر یوزر-اگنت مشکوک بود ثبت فوری شود (بدون نیاز به شمارش)
  if (type === "user_agent_anomaly" && (ua === "" || /curl|sqlmap|python/i.test(ua))) {
    const existingBlock = await db.query(
      `SELECT 1 FROM blocked_ips WHERE ip_address=$1 AND status='blocked'`,
      [ip]
    );
    if (!existingBlock.rowCount) {
      await db.query(
        `INSERT INTO blocked_ips
         (ip_address, reason, status, suspicious_type, severity_level, automatic)
         VALUES ($1,$2,'blocked','user_agent_anomaly','high',true)`,
        [ip, "Blocked for suspicious User-Agent"]
      );
    }
  }
}

// تابع آماده برای تشخیص‌های ساده سریع (مثلاً در 404 روت یا مسیرهای خاص)
export function isSensitivePath(path) {
  const sensitive = ["/wp-login", "/admin/config", "/server.js", "/config.php", "/.env", "/phpmyadmin", "/etc/passwd"];
  return sensitive.some((p) => path.includes(p));
}

export function hasPayloadInjection(body = {}, query = {}) {
  const patterns = [/('|"|--|;|<script>|<iframe>)/i, /(DROP|SELECT|UNION|INSERT|OR 1=1)/i];
  const str = JSON.stringify(body) + JSON.stringify(query);
  return patterns.some((re) => re.test(str));
}

export function isRequestBurst(timestamps, windowMs, maxCount) {
  const now = Date.now();
  const recent = timestamps.filter((t) => now - t < windowMs);
  return recent.length >= maxCount;
}
