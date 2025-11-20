//backend/middleware/checkSensitivePaths.js
import { isSensitivePath, monitorSuspiciousIP } from "./suspiciousDetector.js";

export async function checkSensitivePaths(req, res, next) {
  const path = req.originalUrl || req.url || "";
  if (isSensitivePath(path)) {
    await monitorSuspiciousIP(req, "sensitive_path");
  }
  next(); // ادامه مسیر نرمال
}
