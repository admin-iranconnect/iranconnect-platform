// backend/routes/admin_loginAttempts.js
import express from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";
import {
  getAllLoginAttempts,
  getLoginAttemptDetails,
} from "../controllers/adminLoginAttemptsController.js"; // فقط برای نمایش داده‌ها
import {
  exportLoginAttemptsXLSX,
  exportLoginAttemptsPDF,
} from "../controllers/adminLoginAttemptsExportController.js"; // 📤 برای خروجی‌ها (xlsx/pdf)

const router = express.Router();

/* ==========================
   🔐 Middleware: Admin or SuperAdmin Auth
   ========================== */
async function verifyAdmin(req, res, next) {
  try {
    let token;

    // ✅ بررسی توکن در Header یا Query (برای window.open در PDF/XLSX)
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      "SELECT role, is_blocked FROM users WHERE id = $1",
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const { role, is_blocked } = result.rows[0];

    if (is_blocked) {
      return res
        .status(423)
        .json({ error: "Account locked. Contact administrator." });
    }

    if (role !== "admin" && role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "Admin or Super Admin access required" });
    }

    req.user = { id: decoded.id, role };
    next();
  } catch (err) {
    console.error("❌ verifyAdmin error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* ==========================
   📜 Routes
   ========================== */

// 📋 مشاهده همه لاگ‌های ورود
router.get("/all", verifyAdmin, getAllLoginAttempts);

// 🔍 جزئیات یک لاگ خاص
router.get("/details/:id", verifyAdmin, getLoginAttemptDetails);

// 📤 خروجی XLSX
router.get("/export/xlsx", verifyAdmin, exportLoginAttemptsXLSX);

// 🧾 خروجی PDF
router.get("/export/pdf", verifyAdmin, exportLoginAttemptsPDF);

export default router;
