// backend/routes/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  verify,
  resend,
  checkEmail,
  login,
  agreeTerms,
  forgotPassword,
  resetPassword,
  validateResetToken,
  pingSession,
} from "../controllers/authController.js";
import { me } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import db from "../db.js";
import { authLimiter, forgotLimiter } from "../middleware/rateLimit.js";
import { checkAccountStatus } from "../middleware/accountLockout.js";



const router = express.Router();

/* =====================================================
   🧩 AUTH ROUTES — IranConnect Secure Auth System
   ===================================================== */

// 🟢 ثبت‌نام کاربر جدید
router.post("/register", authLimiter, register);

// 🟢 تأیید ایمیل کاربر
router.post("/verify", authLimiter, verify);

// 🟢 ارسال مجدد کد تأیید
router.post("/resend", authLimiter, resend);

// 🟢 بررسی وجود ایمیل
router.post("/check-email", authLimiter, checkEmail);

// 🟢 لاگین (امن با HS512 + token_version)
router.post("/login", authLimiter, checkAccountStatus, login);

router.get("/me", verifyToken, me);

// 🟢 بررسی وجود توافق تایید شده
router.post("/agree-terms", verifyToken, agreeTerms);

// 🟢 مسیر بررسی وضعیت سشن
router.get("/ping", verifyToken, pingSession);

/* =====================================================
   🔐 Password Recovery Routes — IranConnect
   ===================================================== */


// 📩 ارسال لینک بازیابی رمز عبور
router.post("/forgot", forgotLimiter, forgotPassword);

// 🔑 تغییر رمز عبور با لینک معتبر
router.post("/reset", resetPassword);

// 🟢 بررسی اعتبار توکن ریست رمز
router.get("/validate-reset/:token", validateResetToken);


/* =====================================================
   ✅ EXPORT ROUTER
   ===================================================== */

/**
 * 🟥 LOGOUT — باطل کردن JWT کاربر
 */
router.post("/logout", verifyToken, async (req, res) => {
  try {
    // افزایش token_version → تمام JWTهای قبلی باطل می‌شن
    await db.query(
      "UPDATE users SET token_version = token_version + 1 WHERE id = $1",
      [req.user.id]
    );

    return res.json({ success: true, message: "User logged out securely." });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    return res.status(500).json({ error: "Logout failed." });
  }
});


// 🟢 تغییر رمز عبور توسط کاربر لاگین‌شده
import { changePassword } from "../controllers/authController.js";
router.post("/change-password", verifyToken, changePassword);

export default router;
