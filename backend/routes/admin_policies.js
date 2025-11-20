//backend/routes/admin_policies.js
import express from "express";
import {
  listPolicies,
  exportPoliciesXLSX,
  exportPoliciesPDF,
} from "../controllers/adminPoliciesController.js";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

/* 🧾 Middleware: بررسی نقش ادمین */
async function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ error: "Missing authorization token" });

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query("SELECT role FROM users WHERE id=$1", [
      decoded.id,
    ]);
    if (!result.rows.length || result.rows[0].role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    req.adminId = decoded.id;
    next();
  } catch (err) {
    console.error("❌ verifyAdmin error:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/* ───────────── مسیرهای مدیریت سیاست‌ها ───────────── */
router.get("/", verifyAdmin, listPolicies);
router.get("/export/xlsx", verifyAdmin, exportPoliciesXLSX);
router.get("/export/pdf", verifyAdmin, exportPoliciesPDF);

export default router;
