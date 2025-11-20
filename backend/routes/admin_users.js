//backend/routes/admin_users.js
import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import db from "../db.js";
import nodemailer from "nodemailer";

const router = express.Router();

/* =======================================================
   🛡 Middleware بررسی نقش ادمین (با پشتیبانی از superadmin)
======================================================= */
function adminOnly(req, res, next) {
  try {
    // 🧩 گرفتن توکن از Header یا Query
    let token = null;

    if (req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) return res.status(401).json({ error: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!["admin", "superadmin"].includes(decoded.role))
      return res.status(403).json({ error: "Admin access required" });

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* =======================================================
   🧩 Helper: جلوگیری از تغییر یا حذف Super Admin توسط Admin
======================================================= */
async function protectSuperAdmin(targetUserId, req, res) {
  const { rows } = await pool.query(
    "SELECT id, email, role FROM users WHERE id=$1",
    [targetUserId]
  );
  if (!rows.length) return { allowed: false, message: "User not found" };

  const target = rows[0];
  // جلوگیری از دسترسی ادمین به سوپرادمین یا سایر عملیات خاص
  if (req.user.role === "admin") {
    if (target.role === "superadmin" || target.role === "admin") {
      return {
        allowed: false,
        message: "Admins cannot modify or delete Admin or Super Admin accounts.",
        target,
      };
    }
  }

  if (target.role === "superadmin" && req.user.role !== "superadmin") {
    return {
      allowed: false,
      message: "You cannot modify or delete a Super Admin account.",
      target,
    };
  }

  return { allowed: true, target };
}

/* =======================================================
   🟢 ثبت لاگ عملیات ادمین
======================================================= */
async function logAdminAction(adminId, type, targetId, desc) {
  try {
    await db.query(
      `INSERT INTO admin_actions_logs (admin_id, action_type, target_user_id, description)
       VALUES ($1, $2, $3, $4)`,
      [adminId, type, targetId || null, desc || null]
    );
  } catch (err) {
    console.error("⚠️ Error logging admin action:", err.message);
  }
}

/* =======================================================
   🔓 بلاک / آنبلاک کاربر
======================================================= */
router.patch("/:id/block", adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await protectSuperAdmin(id, req, res);
    if (!check.allowed) return res.status(403).json({ error: check.message });

    const userRes = await pool.query(
      "SELECT is_blocked, email FROM users WHERE id=$1",
      [id]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: "User not found" });

    const current = userRes.rows[0];
    const newStatus = !current.is_blocked;

    await pool.query("UPDATE users SET is_blocked=$1 WHERE id=$2", [
      newStatus,
      id,
    ]);
    await logAdminAction(
      req.user.id,
      newStatus ? "BLOCK_USER" : "UNBLOCK_USER",
      id,
      `${newStatus ? "Blocked" : "Unblocked"} user ${current.email}`
    );

    res.json({
      message: `User ${newStatus ? "blocked" : "unblocked"} successfully`,
    });
  } catch (err) {
    console.error("❌ Block/unblock user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================================
   👑 تغییر نقش کاربر (فقط برای SuperAdmin)
======================================================= */
router.patch("/:id/role", adminOnly, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["user", "admin", "superadmin"].includes(role))
    return res.status(400).json({ error: "Invalid role" });

  try {
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ error: "Only Super Admins can change user roles." });
    }

    const target = await pool.query(
      "SELECT role, email FROM users WHERE id=$1",
      [id]
    );
    if (!target.rows.length)
      return res.status(404).json({ error: "User not found" });

    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, id]);
    await logAdminAction(
      req.user.id,
      "CHANGE_ROLE",
      id,
      `Changed role of ${target.rows[0].email} to ${role}`
    );

    res.json({ message: "Role updated successfully" });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================================
   🗑 حذف کاربر (محدودیت برای Admin)
======================================================= */
router.delete("/:id", adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await protectSuperAdmin(id, req, res);
    if (!check.allowed) return res.status(403).json({ error: check.message });

    await logAdminAction(
      req.user.id,
      "DELETE_USER",
      id,
      `Deleted user ${check.target.email}`
    );
    await pool.query("DELETE FROM users WHERE id=$1", [id]);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================================
   ✉️ ارسال ایمیل به کاربر (هر دو نقش مجاز)
======================================================= */
router.post("/:id/send-email", adminOnly, async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;

  if (!subject || !message)
    return res.status(400).json({ error: "Subject and message required" });

  try {
    const check = await protectSuperAdmin(id, req, res);
    if (!check.allowed) return res.status(403).json({ error: check.message });

    const userEmail = check.target.email;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.GMAIL_SUPPORT_USER, // مثال: support@iranconnect.org یا Gmail
        pass: process.env.GMAIL_SUPPORT_PASS, // App Password
      },
    });

    await transporter.sendMail({
      from: `"IranConnect Admin" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject,
      html: `<p>${message}</p><hr><p style="font-size:12px;color:#888">Sent via IranConnect Admin Panel</p>`,
    });

    await logAdminAction(
      req.user.id,
      "SEND_EMAIL",
      id,
      `Sent email to ${userEmail} with subject "${subject}"`
    );

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("❌ Send email error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

/* =======================================================
   🔍 جزئیات کاربر (ادمین نمی‌تونه ادمین یا سوپرادمین رو ببینه)
======================================================= */
router.get("/:id", adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId))
      return res.status(400).json({ error: "Invalid user ID" });

    const result = await pool.query(
      `SELECT id, email, role, is_verified, is_blocked, created_at, last_login_at
       FROM users WHERE id=$1`,
      [userId]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    if (req.user.role === "admin" && ["admin", "superadmin"].includes(user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied to Admin or Super Admin details." });
    }

    const bizClaimRes = await pool.query(
      `SELECT COUNT(*) FROM business_claims WHERE user_id=$1 AND status='verified'`,
      [userId]
    );

    const rateRes = await pool.query(
      `SELECT COUNT(*) FROM ratings WHERE user_id=$1`,
      [userId]
    );

    user.business_count = parseInt(bizClaimRes.rows[0].count, 10);
    user.rating_count = parseInt(rateRes.rows[0].count, 10);

    res.json(user);
  } catch (err) {
    console.error("❌ Error fetching user details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =======================================================
   🟩 لیست کاربران (با فیلتر)
======================================================= */
router.get("/", adminOnly, async (req, res) => {
  try {
    const { q, role, verified } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (req.user.role === "admin") {
      where += " AND role NOT IN ('admin', 'superadmin')";
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND email ILIKE $${params.length}`;
    }
    if (role) {
      params.push(role);
      where += ` AND role = $${params.length}`;
    }
    if (verified === "true" || verified === "false") {
      params.push(verified === "true");
      where += ` AND is_verified = $${params.length}`;
    }

    const r = await pool.query(
      `SELECT id, email, role, is_verified, is_blocked, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT 500`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =======================================================
   🧾 ثبت لاگ عمومی از سمت فرانت‌اند (Admin + SuperAdmin)
======================================================= */
router.post("/logs", adminOnly, async (req, res) => {
  const { action_type, target_user_id, description } = req.body;

  try {
    await db.query(
      `INSERT INTO admin_actions_logs (admin_id, action_type, target_user_id, description)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, action_type, target_user_id || null, description || null]
    );
    res.json({ message: "Log recorded successfully" });
  } catch (err) {
    console.error("❌ Log save error:", err);
    res.status(500).json({ error: "Failed to save log" });
  }
});

import { exportUsersXLSX, exportUsersPDF } from "../controllers/adminUsersExportController.js";

router.get("/export/xlsx", adminOnly, exportUsersXLSX);
router.get("/export/pdf", adminOnly, exportUsersPDF);

export default router;
