//backend/routes/admin.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db.js";
import fs from "fs";
import path from "path";
import { sendEmail } from "../utils/mailer.js";

const router = express.Router();

/* --------------------------------------
   📦 CRUD: Businesses
-------------------------------------- */
router.get("/businesses", async (req, res) => {
  const r = await db.query("SELECT * FROM businesses ORDER BY created_at DESC");
  res.json(r.rows);
});

router.post("/businesses", async (req, res) => {
  const {
    country,
    city,
    category,
    name,
    address,
    phone,
    email,
    website,
    lat,
    lng,
    logo_url,
  } = req.body;

  const r = await db.query(
    `INSERT INTO businesses
     (country, city, category, name, address, phone, email, website, lat, lng, logo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      country,
      city,
      category,
      name,
      address,
      phone,
      email,
      website,
      lat,
      lng,
      logo_url,
    ]
  );

  res.json(r.rows[0]);
});

router.put("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const set = [];
  const vals = [];
  let i = 1;

  for (const k in fields) {
    set.push(`${k}=$${i}`);
    vals.push(fields[k]);
    i++;
  }

  const sql = `UPDATE businesses SET ${set.join(
    ","
  )}, updated_at=now() WHERE id=$${i} RETURNING *`;
  vals.push(id);
  const r = await db.query(sql, vals);
  res.json(r.rows[0]);
});

router.delete("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM businesses WHERE id=$1", [id]);
  res.json({ ok: true });
});

/* --------------------------------------
   🔐 Change Password (for logged-in user)
-------------------------------------- */
router.post("/change-password", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Please provide both passwords." });
    }

    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\\-+={}\\[\\]|:;\"'<>,.?/~`]).{8,}$/;
    if (!strongRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "Password must include uppercase, lowercase, number and special character (min 8 chars).",
      });
    }

    const userRes = await db.query(
      "SELECT id, password_hash FROM users WHERE id=$1",
      [decoded.id]
    );
    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      hashed,
      user.id,
    ]);

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Server error during password change." });
  }
});

/* --------------------------------------
   🛡️ ارسال ایمیل اطلاع‌رسانی سیاست‌ها (Admin-only + Queue)
-------------------------------------- */
router.post("/send-policy-update", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // فقط ادمین اجازه ارسال دارد
    const userCheck = await db.query("SELECT role FROM users WHERE id=$1", [
      decoded.id,
    ]);
    if (!userCheck.rows.length || userCheck.rows[0].role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin privileges required." });
    }

    // فایل قالب ایمیل را بخوان
    const filePath = path.resolve("backend/data/policy_update_emails.json");
    const template = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // لیست کاربران تاییدشده
    const users = await db.query(
      "SELECT email FROM users WHERE is_verified = true"
    );
    if (users.rowCount === 0) {
      return res.status(404).json({ error: "No verified users found." });
    }

    // ارسال با Queue (هر 2 ثانیه)
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    (async () => {
      console.log(`🚀 Starting bulk email queue for ${users.rowCount} users...`);
      for (const [i, u] of users.rows.entries()) {
        try {
          await sendEmail(u.email, template.subject, template.body);
          await db.query(
            "INSERT INTO policy_email_logs (policy_version, sent_to) VALUES ($1, $2)",
            ["v1.1", u.email]
          );
          console.log(`✅ Sent to: ${u.email} (${i + 1}/${users.rowCount})`);
          await delay(2000); // 2 ثانیه فاصله بین هر ایمیل
        } catch (e) {
          console.error(`❌ Failed to send to ${u.email}`, e.message);
        }
      }
      console.log("🎯 All emails processed.");
    })();

    res.json({
      message: `🕒 Sending ${users.rowCount} policy update emails in queue (approx ${Math.ceil(
        users.rowCount * 2
      )} seconds total).`,
    });
  } catch (err) {
    console.error("📩 Email send error:", err);
    res
      .status(500)
      .json({ error: "Server error during policy update email broadcast." });
  }
});

export default router;
