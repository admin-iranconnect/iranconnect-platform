// backend/routes/businessClaims.js
import express from "express";
import { startClaim, verifyClaim } from "../controllers/claimController.js";
import secureUpload from "../middleware/uploadSecure.js";
import { verifyToken } from "../middleware/authMiddleware.js"; // 🔒 بررسی لاگین کاربر
import db from "../db.js";

const router = express.Router();

/* 
  🟢 مسیرهای مربوط به فرآیند Claim (ادعای مالکیت بیزینس)
  - فقط برای کاربران لاگین‌شده قابل استفاده
  - شامل آپلود مدرک مالکیت (PDF/JPG/PNG)
*/

// ثبت ادعای مالکیت جدید
router.post("/:id/claim/start", verifyToken, secureUpload.single("document"), startClaim);

// (اختیاری، فقط برای سازگاری با نسخه‌های قبلی)
router.post("/:id/claim/verify", verifyToken, verifyClaim);

/* 
  🔹 مسیر جدید: دریافت لیست ادعاهای مالکیت (Claim) کاربر لاگین‌شده
  برای نمایش در منوی پروفایل → Requests / History
*/
router.get("/my", verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM business_claims 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching user claims:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
