// backend/routes/owner.js
import express from "express";
import db from "../db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 📋 دریافت لیست بیزینس‌های تاییدشده که مالک کاربر فعلی است
 */
router.get("/me/owned-businesses", verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, city, country, category, sub_category, owner_verified, owner_email
         FROM businesses
        WHERE owner_verified = true AND owner_email = $1
        ORDER BY created_at DESC`,
      [req.user.email]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching owned businesses:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
