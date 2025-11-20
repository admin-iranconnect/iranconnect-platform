// backend/middleware/handle404.js
import { monitorSuspiciousIP } from "./suspiciousDetector.js";

export async function handle404(req, res, next) {
  await monitorSuspiciousIP(req, "404_scan");
  res.status(404).json({ error: "Not Found" });
}
