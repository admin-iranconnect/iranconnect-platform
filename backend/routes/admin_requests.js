//backend/routes/admin_requests.js
import express from "express";
import {
  listRequests,
  getRequestDetails,
  updateRequestStatus,
  downloadRequestData
} from "../controllers/adminBusinessRequestsController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import {
  exportRequestsPDF,
  exportRequestsXLSX,
} from "../controllers/adminBusinessRequestsExportController.js";

const router = express.Router();

router.get("/", verifyAdmin, listRequests);
router.get("/:id", verifyAdmin, getRequestDetails);
router.put("/:id/status", verifyAdmin, updateRequestStatus);
router.get("/:id/download", verifyAdmin, downloadRequestData);
router.get("/export/pdf", verifyAdmin, exportRequestsPDF);
router.get("/export/xlsx", verifyAdmin, exportRequestsXLSX);

export default router;
