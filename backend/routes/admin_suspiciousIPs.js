//backend/routes/admin_suspiciousIPs.js
import express from "express";
import {
  getRecentSuspiciousIPs,
  getSuspiciousIPDetails,
  blockIPManually,
  unblockIP,
  getUnblockedSuspiciousCount,
  getSuspiciousIPCount,
  getSuspiciousIPs
} from "../controllers/adminSuspiciousIPController.js";

import {
  exportSuspiciousIPsXLSX,
  exportSuspiciousIPsPDF
} from "../controllers/adminSuspiciousIPsExportController.js";

import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   📤 Export Routes (Public for Admin token)
   ============================================================ */
router.get("/export/xlsx", exportSuspiciousIPsXLSX);
router.get("/export/pdf", exportSuspiciousIPsPDF);

/* ============================================================
   🔢 Counts (For Sidebar)
   ============================================================ */
router.get("/count-unblocked", getUnblockedSuspiciousCount);
router.get("/recent", getRecentSuspiciousIPs);
router.get("/count", getSuspiciousIPCount);

/* ============================================================
   🔍 Get details of a specific Suspicious IP (with pagination)
   ============================================================ */
router.get("/details/ip/:ip", getSuspiciousIPDetails);

/* ============================================================
   🔐 Admin-only routes
   ============================================================ */
router.use(verifyAdmin);

/* ============================================================
   📌 Main list with filters + pagination
   ============================================================ */
router.get("/", getSuspiciousIPs);

/* ============================================================
   🚫 Block / Unblock
   ============================================================ */
router.post("/block", blockIPManually);
router.post("/unblock", unblockIP);

export default router;
