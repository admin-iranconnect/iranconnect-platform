//backend/routes/admin_consents.js
import express from "express";
import {
  listConsents,
  exportConsentsXLSX,
  exportConsentsPDF,
} from "../controllers/adminConsentsController.js";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

/* 🧾 Middleware: تأیید توکن و نقش ادمین یا سوپر ادمین */
async function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ error: "Missing authorization token" });

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // بررسی نقش در دیتابیس
    const result = await db.query("SELECT role FROM users WHERE id=$1", [
      decoded.id,
    ]);

    if (!result.rows.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userRole = result.rows[0].role;

    // ✅ فقط admin یا superadmin مجازند
    if (userRole !== "admin" && userRole !== "superadmin") {
      return res.status(403).json({ error: "Admin or Super Admin access required" });
    }

    req.adminId = decoded.id;
    next();
  } catch (err) {
    console.error("❌ verifyAdmin error:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/* ───────────── مسیرهای مدیریت رضایت کاربران (User Consents) ───────────── */

// 📋 دریافت تمام رضایت‌ها
router.get("/", verifyAdmin, listConsents);

// 📤 خروجی Excel
router.get("/export/xlsx", verifyAdmin, exportConsentsXLSX);

// 🧾 خروجی PDF
router.get("/export/pdf", verifyAdmin, exportConsentsPDF);

export default router;
