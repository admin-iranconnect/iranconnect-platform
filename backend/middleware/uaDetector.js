//backend/middleware/uaDetector.js
import { monitorSuspiciousIP } from "./suspiciousDetector.js";

const suspiciousPatterns = [/curl/i, /sqlmap/i, /python/i, /wget/i, /bot/i];

export async function detectUserAgentAnomaly(req, res, next) {
  const ua = req.headers["user-agent"] || "";

  if (!ua || suspiciousPatterns.some((p) => p.test(ua))) {
    await monitorSuspiciousIP(req, "user_agent_anomaly");
  }

  next();
}
