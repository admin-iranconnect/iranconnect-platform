//backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import db from "../db.js";

/* ───────────────────────────────
   🧩 IranConnect Authentication Middleware
   ─────────────────────────────── */

/* ===============================
   🔑 verifyToken — برای کاربران عادی
   =============================== */
export async function verifyToken(req, res, next) {
  try {
    // 🔒 پشتیبانی از HttpOnly cookies در کنار Authorization header
    let token = null;

    // 1️⃣ ابتدا از کوکی بخوان (امن‌تر)
    if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    }
    // 2️⃣ در غیر اینصورت از Authorization header
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS512"],
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ error: "Session expired. Please log in again." });
      }
      console.error("❌ Invalid token:", err.message);
      return res.status(403).json({ error: "Invalid or tampered token." });
    }

    if (!decoded?.id || !decoded?.role) {
      return res.status(403).json({ error: "Invalid token payload" });
    }

    const { rows } = await db.query(
      `SELECT id, email, role, is_verified, token_version, 
              COALESCE(is_blocked,false) AS is_blocked
       FROM users WHERE id=$1`,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(403).json({ error: "User not found or deleted" });
    }

    const user = rows[0];

    if (user.is_blocked) {
      return res.status(423).json({
        error: "Account temporarily locked.",
        next_step: "Please contact support or reset your password.",
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Account not verified" });
    }

    // بررسی تطابق token_version — فقط برای توکن‌های معمولی (نه موقت)
    if (!decoded.temporary) {
      if ((decoded.ver || 0) < (user.token_version || 0)) {
        return res.status(440).json({
          error: "Session invalidated. Please log in again.",
          reason: "logged_in_elsewhere",
        });
      }
    }

    req.user = { ...user, jwt_version: decoded.ver };
    next();
  } catch (err) {
    console.error("❌ verifyToken failed:", err.message);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

/* ===============================
   🛡 verifyAdmin — برای مسیرهای مدیریتی
   =============================== */
export async function verifyAdmin(req, res, next) {
  try {
    // 🔒 پشتیبانی از HttpOnly cookies در کنار Authorization header
    let token = null;

    if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS512"],
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ error: "Session expired. Please log in again." });
      }
      console.error("❌ Admin token invalid:", err.message);
      return res.status(403).json({ error: "Invalid admin token." });
    }

    if (!decoded?.id || !decoded?.role) {
      return res.status(403).json({ error: "Invalid admin token payload" });
    }

    const { rows } = await db.query(
      `SELECT id, email, role, token_version, 
              COALESCE(is_blocked,false) AS is_blocked
       FROM users WHERE id=$1`,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(403).json({ error: "Admin not found or removed" });
    }

    const admin = rows[0];

    if (admin.is_blocked) {
      return res.status(423).json({
        error: "Admin account locked.",
        next_step: "Please contact system administrator.",
      });
    }

    // ✅ اجازه دسترسی فقط برای admin یا superadmin
    if (admin.role !== "admin" && admin.role !== "superadmin") {
      console.warn(`🚫 Access denied: ${admin.email} (role=${admin.role})`);
      return res
        .status(403)
        .json({ error: "Admin or Super Admin access required." });
    }

    // بررسی نسخه توکن
    if ((decoded.ver || 0) < (admin.token_version || 0)) {
      console.warn(`🚫 Admin token mismatch for ${admin.email}`);
      return res.status(440).json({
        error: "Session invalidated.",
        reason: "logged_in_elsewhere",
      });
    }

    req.user = { ...admin, token_version: decoded.ver };
    next();
  } catch (err) {
    console.error("❌ verifyAdmin failed:", err.message);
    return res.status(403).json({ error: "Access denied." });
  }
}

