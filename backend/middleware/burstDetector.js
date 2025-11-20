//backend/middleware/burstDetector.js
import { monitorSuspiciousIP } from "./suspiciousDetector.js";

const ipRequestTimestamps = new Map(); // Map<string, number[]>
const WINDOW_MS = 10 * 1000; // 10 ثانیه
const MAX_REQUESTS = 30;

export async function detectBurst(req, res, next) {
  const ip = req.ip;

  if (!ipRequestTimestamps.has(ip)) {
    ipRequestTimestamps.set(ip, []);
  }

  const now = Date.now();
  const timestamps = ipRequestTimestamps.get(ip).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  ipRequestTimestamps.set(ip, timestamps);

  if (timestamps.length > MAX_REQUESTS) {
    await monitorSuspiciousIP(req, "burst");
  }

  next();
}
