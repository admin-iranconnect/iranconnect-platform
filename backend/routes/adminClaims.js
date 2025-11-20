//backend/routes/adminClaims.js
import express from "express";
import {
  uploadClaimFile,
  uploadClaimDocument,
  listClaims,
  approveClaim,
  rejectClaim,
  exportClaimsXLSX,
  exportClaimsPDF,
  downloadClaimDocument,
} from "../controllers/adminClaimController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", listClaims);

// 📎 آپلود مدرک
router.post("/upload-document", uploadClaimFile, uploadClaimDocument);

// 📎 دانلود مدرک
router.get("/download/:id", downloadClaimDocument);

// ✅ حالا این دو مسیر هر دو note در body می‌گیرن
router.post("/:id/approve", approveClaim);
router.post("/:id/reject", rejectClaim);

router.get("/export/xlsx", exportClaimsXLSX);
router.get("/export/pdf", exportClaimsPDF);

// 📎 دانلود مدرک مالکیت (با JWT)
router.get("/:id/document", verifyToken, downloadClaimDocument);

export default router;
