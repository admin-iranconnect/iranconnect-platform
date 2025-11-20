//backend/routes/admin_stats.js
import express from "express";
import pool from "../db.js";
import { verifyAdmin } from "../middleware/authMiddleware.js"; // ⬅️ استفاده از نسخه مرکزی و امن

const router = express.Router();

// آمار کلی
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const [users, businesses, ratings] = await Promise.all([
      pool.query("SELECT COUNT(*) AS count FROM users"),
      pool.query("SELECT COUNT(*) AS count FROM businesses"),
      pool.query("SELECT COALESCE(AVG(score), 0)::numeric(4,2) AS avg_rating FROM ratings"),
    ]);

    const usersCount = parseInt(users.rows[0].count, 10);
    const bizCount = parseInt(businesses.rows[0].count, 10);
    const avgRating = parseFloat(ratings.rows[0].avg_rating);

    // آمار ماهانه کاربران برای نمودار
    const monthly = await pool.query(`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*) AS count
      FROM users
      GROUP BY 1
      ORDER BY 1 ASC;
    `);

    res.json({
      users: usersCount,
      businesses: bizCount,
      avg_rating: avgRating,
      monthly: monthly.rows,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
