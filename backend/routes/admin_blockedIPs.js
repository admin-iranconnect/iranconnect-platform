// backend/routes/admin_blockedIPs.js
import express from "express";
import {
  getBlockedIPs,
  getBlockedIPDetails,
  unblockBlockedIP
} from "../controllers/adminBlockedIPController.js";

import {
  exportBlockedIPsXLSX,
  exportBlockedIPsPDF,
} from "../controllers/adminBlockedIPsExportController.js";

import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   📤 Export Routes (public for admin via token)
============================================================ */
router.get("/export/xlsx", exportBlockedIPsXLSX);
router.get("/export/pdf", exportBlockedIPsPDF);

/* ============================================================
   🔐 Admin-only routes
============================================================ */
router.use(verifyAdmin);

/* ============================================================
   📌 List + Filters + Pagination
============================================================ */
router.get("/", getBlockedIPs);

/* ============================================================
   🔍 Blocked IP Details (modal)
============================================================ */
router.get("/details/:ip", getBlockedIPDetails);

/* ============================================================
   🚫 Unblock (Superadmin only)
============================================================ */
router.post("/unblock", unblockBlockedIP);

export default router;

