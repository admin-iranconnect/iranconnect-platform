// backend/routes/consent.js
import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * 🟢 PUT /api/users/consent
 * ثبت رضایت کاربر برای نوع مشخصی از پالیسی (terms, privacy, cookies)
 */
router.put("/", async (req, res) => {
  try {
    const { consent_type, version, choice } = req.body;
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!consent_type)
      return res.status(400).json({ error: "Missing consent_type" });

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const agent = req.headers["user-agent"];

    // ثبت رضایت در جدول user_consents
    await pool.query(
      `INSERT INTO user_consents 
       (user_id, consent_type, version, choice, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, consent_type, version || "v1.0", choice || "accepted", ip, agent]
    );

    res.json({
      message: "✅ Consent recorded successfully",
      data: { user_id: userId, consent_type, version, choice },
    });
  } catch (err) {
    console.error("❌ Consent error:", err);
    res.status(500).json({ error: "Server error recording consent" });
  }
});

/**
 * 🟣 GET /api/users/consent/:type
 * دریافت آخرین رضایت ثبت‌شده برای یک نوع پالیسی
 */
router.get("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT * FROM user_consents 
       WHERE user_id=$1 AND consent_type=$2
       ORDER BY created_at DESC LIMIT 1`,
      [decoded.id, type]
    );

    if (result.rowCount === 0)
      return res.json({ accepted: false, version: null });

    res.json({
      accepted: result.rows[0].choice === "accepted",
      version: result.rows[0].version,
      date: result.rows[0].created_at,
    });
  } catch (err) {
    console.error("❌ Fetch consent error:", err);
    res.status(500).json({ error: "Server error fetching consent" });
  }
});

export default router;
