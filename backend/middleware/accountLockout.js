// backend/middleware/accountLockout.js
import db from "../db.js";


/* =====================================================
   ⚙️ Configurable limits (with .env fallback)
   ===================================================== */
const MAX_FAILED = parseInt(process.env.LOGIN_LOCK_ATTEMPTS || "10", 10);     // قفل موقت پس از چند تلاش ناموفق
const MAX_BLOCK = parseInt(process.env.LOGIN_BLOCK_ATTEMPTS || "20", 10);     // بلاک دائم پس از چند تلاش زیاد
const LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES || "15", 10);    // مدت قفل موقت
const LOG_WARN_AFTER = parseInt(process.env.LOGIN_WARN_ATTEMPTS || "5", 10);  // آستانه هشدار رفتار مشکوک

/* =====================================================
   🧱 Middleware: Check account lock/block before login
   ===================================================== */
export async function checkAccountStatus(req, res, next) {
  console.log("🟡 checkAccountStatus middleware reached");
  const { email } = req.body;
  if (!email) return next(); // در صورت عدم ارسال ایمیل، ادامه بده (مثلاً در register)

  try {
    const result = await db.query(
      "SELECT id, is_blocked, failed_logins, last_failed_login FROM users WHERE email=$1",
      [email]
    );
    if (result.rowCount === 0) return next(); // اگر کاربر وجود ندارد، ادامه بده

    const user = result.rows[0];

    // 🚫 اگر حساب بلاک شده
    if (user.is_blocked) {
      // 🔥 ثبت تلاش لاگین برای اکانت بلاک‌شده
      await recordLoginAttempt({
        userId: user.id,
        email,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        success: false,
      });

      return res.status(403).json({
        blocked: true,
        message: "Your account has been suspended. Please contact support@iranconnect.org.",
        contact_url: "/contact",
      });
    }

    // 🔒 بررسی قفل موقت
    if (
      user.failed_logins >= MAX_FAILED &&
      user.last_failed_login &&
      new Date() - new Date(user.last_failed_login) <
        LOCK_MINUTES * 60 * 1000
    ) {
      const remaining =
        LOCK_MINUTES -
        Math.floor(
          (new Date() - new Date(user.last_failed_login)) / 60000
        );
      return res.status(429).json({
        error: `Too many failed attempts. Please wait ${remaining} minutes.`,
      });
    }

    next();
  } catch (err) {
    console.error("checkAccountStatus error:", err);
    next(); // حتی در صورت خطا اجازه ادامه بده تا سیستم قطع نشود
  }
}

/* =====================================================
   🧾 Record login attempt (for auditing)
   ===================================================== */
export async function recordLoginAttempt({
  userId = null,
  email = null,
  ip,
  userAgent,
  success,
  location = null,
}) {
  try {
    await db.query(
      `INSERT INTO login_attempts (user_id, email, ip_address, user_agent, success, location)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, ip, userAgent, success, location]
    );
  } catch (err) {
    console.error("⚠️ recordLoginAttempt error:", err.message);
  }
}

/* =====================================================
   🚨 Handle failed login (increment counter & block logic)
   ===================================================== */
export async function handleFailedLogin(user) {
  try {
    // افزایش شمارنده و ثبت زمان
    await db.query(
      `UPDATE users
       SET failed_logins = COALESCE(failed_logins,0) + 1,
           last_failed_login = NOW()
       WHERE id=$1`,
      [user.id]
    );

    // دریافت مقدار جدید برای بررسی
    const { rows } = await db.query(
      "SELECT failed_logins, last_failed_login, is_blocked FROM users WHERE id=$1",
      [user.id]
    );

    const { failed_logins, last_failed_login, is_blocked } = rows[0];

    if (is_blocked) return; // اگر قبلاً بلاک شده، کار خاصی نکن

    // 🔸 هشدار رفتار مشکوک
    if (failed_logins === LOG_WARN_AFTER) {
      console.warn(`⚠️ Suspicious login pattern for user ID ${user.id}`);
    }

    // 🔒 بلاک موقت (بدون نیاز به پرچم جدا)
    if (
      failed_logins >= MAX_FAILED &&
      new Date() - new Date(last_failed_login) < LOCK_MINUTES * 60 * 1000
    ) {
      console.warn(
        `🚫 Temporary lockout for user ID ${user.id} after ${failed_logins} failed logins`
      );
    }

    // 🚫 بلاک دائم پس از تلاش‌های بسیار زیاد
    if (failed_logins >= MAX_BLOCK) {
      await db.query("UPDATE users SET is_blocked = true WHERE id=$1", [
        user.id,
      ]);
      console.warn(
        `🚨 Account permanently blocked for user ID ${user.id} after excessive failed logins`
      );
    }
  } catch (err) {
    console.error("handleFailedLogin error:", err);
  }
}

/* =====================================================
   🟢 Handle successful login (reset counters & update last login)
   ===================================================== */
export async function handleSuccessfulLogin(user, req) {
  try {
    await db.query(
      `UPDATE users
       SET failed_logins=0,
           last_failed_login=NULL,
           last_login_at=NOW(),
           last_login_ip=$1,
           last_login_agent=$2
       WHERE id=$3`,
      [req.ip, req.headers["user-agent"], user.id]
    );
  } catch (err) {
    console.error("handleSuccessfulLogin error:", err);
  }
}
