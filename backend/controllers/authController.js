// backend/controllers/authController.js
import db from "../db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/sendEmail.js";
import { verifyRecaptcha } from "../utils/verifyRecaptcha.js";
import {
  checkAccountStatus,
  recordLoginAttempt,
  handleFailedLogin,
  handleSuccessfulLogin,
} from "../middleware/accountLockout.js";
import { monitorSuspiciousIP } from "../utils/suspiciousDetector.js";


const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

dotenv.config();

function getCookieOptions(req) {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    domain: ".iranconnect.org",   // 🔥 این خط را اضافه کن
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/* ================================
   📩 پیکربندی nodemailer
================================== */
const logoPath = path.resolve("../frontend/public/logo-dark.png");
let logoSrc = "";
try {
  const logoData = fs.readFileSync(logoPath).toString("base64");
  logoSrc = `data:image/png;base64,${logoData}`;
} catch {
  console.warn("⚠️ Logo not found — continuing without embedded logo.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_VERIFICATION_USER,
    pass: process.env.GMAIL_VERIFICATION_PASS,
  },
});

/* ================================
   🧾 ثبت لاگ ایمیل
================================== */
async function logEmail({ email, userId = null, type, status, error = null }) {
  try {
    await db.query(
      `INSERT INTO email_logs (user_id, recipient_email, type, status, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, email, type, status, error]
    );
  } catch (e) {
    console.error("logEmail error (non-blocking):", e?.message || e);
  }
}

/* ================================
   ✉️ ارسال ایمیل وریفای
================================== */
async function sendVerificationEmail(email, code) {
  const brand = {
    navy: "#0A1D37",
    turquoise: "#00bfa6",
    text: "#0a1b2a",
    bg: "#ffffff",
    soft: "#f5f7fa",
    border: "#e6e8ee",
  };

  const verifyUrl = `https://iranconnect.fr/auth/verify?email=${encodeURIComponent(
    email
  )}`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:${brand.soft};padding:24px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="max-width:560px;margin:0 auto;background:${brand.bg};
             border:1px solid ${brand.border};border-radius:14px;
             box-shadow:0 6px 18px rgba(10,29,55,0.06);">
      <tr>
        <td style="padding:24px;text-align:center;">
          ${
            logoSrc
              ? `<img src="${logoSrc}" alt="IranConnect" width="120" style="display:inline-block"/>`
              : `<h2 style="color:${brand.navy}">IranConnect</h2>`
          }
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 8px;text-align:center;">
          <h2 style="margin:0;color:${brand.navy};font-size:22px;">Verify your email</h2>
          <p style="color:${brand.text};opacity:.9;margin:8px 0;font-size:14px;">
            Use this one-time code to complete your signup:</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;text-align:center;">
          <div style="display:inline-block;padding:12px 20px;border-radius:12px;
                      border:1px dashed ${brand.turquoise};color:${brand.turquoise};
                      font-size:28px;font-weight:700;letter-spacing:4px;">
            ${code}
          </div>
          <p style="color:${brand.text};opacity:.8;margin:10px 0;font-size:13px;">
            This code is valid for <strong>3 minutes</strong>.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 24px;text-align:center;">
          <a href="${verifyUrl}"
             style="display:inline-block;background:${brand.turquoise};
                    color:#0A1D37;text-decoration:none;padding:10px 16px;
                    border-radius:10px;font-weight:600;">
             Open Verify Page
          </a>
        </td>
      </tr>
    </table>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"IranConnect" <verify@iranconnect.org>`,
      to: email,
      subject: "Your IranConnect verification code",
      html,
    });
    await logEmail({ email, type: "verify_send", status: "sent" });
  } catch (err) {
    await logEmail({
      email,
      type: "verify_send",
      status: "failed",
      error: err?.message || String(err),
    });
    throw err;
  }
}

/* ================================
   🟢 REGISTER — ثبت کاربر
================================== */
export async function register(req, res) {
  const { email, password, agreed_terms } = req.body;

  const isHuman = await verifyRecaptcha(req.body.recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({ error: "reCAPTCHA verification failed." });
    }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ error: "Invalid email format" });
  if (!password || password.length < 8)
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });

  try {
    const existing = await db.query(
      "SELECT id, is_verified FROM users WHERE email=$1",
      [email]
    );
    if (existing.rowCount > 0) {
      const user = existing.rows[0];
      if (user.is_verified)
        return res
          .status(409)
          .json({
            error: "This email is already registered. Please log in.",
          });
      else
        return res.status(409).json({
          error:
            "Account exists but not verified. Please verify your email.",
          unverified: true,
        });
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expire = new Date(Date.now() + 3 * 60 * 1000);
    const agreementDate = agreed_terms ? new Date() : null;

    const result = await db.query(
      `INSERT INTO users (email, password_hash, verification_code, verification_expires, agreed_terms, agreement_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, is_verified`,
      [
        email,
        hashed,
        hashedCode,
        expire,
        agreed_terms || false,
        agreementDate,
      ]
    );

    await sendVerificationEmail(email, code);
    res.json({
      message: "Registered successfully. Verification email sent.",
      redirect: `/auth/verify?email=${encodeURIComponent(email)}`,
      user: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res
      .status(500)
      .json({ error: "Server error. Please try again later." });
  }
}

/* ================================
   🔍 CHECK EMAIL
================================== */
export async function checkEmail(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const r = await db.query(
      "SELECT id, is_verified FROM users WHERE email=$1 LIMIT 1",
      [email]
    );
    if (r.rowCount === 0) return res.json({ exists: false });
    const user = r.rows[0];
    res.json({ exists: true, verified: user.is_verified });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
}

/* ================================
   🟢 VERIFY — Email Code Verification (Optimized)
================================== */
export async function verify(req, res) {
  
  
  
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const r = await db.query(
      `SELECT id, role, verification_code, verification_expires, agreed_terms
       FROM users WHERE email=$1`,
      [email]
    );

    if (r.rowCount === 0)
      return res.status(400).json({ error: "Invalid code" });

    const user = r.rows[0];

    // 🔒 بررسی انقضای کد
    if (new Date(user.verification_expires) < new Date())
      return res.status(400).json({ error: "Code expired" });

    const valid = await bcrypt.compare(code, user.verification_code);
    if (!valid) return res.status(400).json({ error: "Invalid code" });

    // ✅ وریفای نهایی
    await db.query(
      "UPDATE users SET is_verified=true, verification_code=NULL, verification_expires=NULL WHERE id=$1",
      [user.id]
    );

    // ثبت رضایت اولیه کاربر
    if (user.agreed_terms) {
      const ip = req.ip || null;
      const ua = req.headers["user-agent"] || null;
      const types = ["terms", "privacy", "cookies"];
      for (const type of types) {
        await db.query(
          `INSERT INTO user_consents (user_id, consent_type, version, choice, ip_address, user_agent)
           VALUES ($1,$2,'v1.0','accepted',$3,$4)`,
          [user.id, type, ip, ua]
        );
      }
    }

    // 🧩 ایجاد سشن جدید با token_version
    const bumpRes = await db.query(
      `UPDATE users
       SET token_version = COALESCE(token_version,0) + 1
       WHERE id=$1
       RETURNING token_version`,
      [user.id]
    );
    const ver = bumpRes.rows[0].token_version;

    const token = jwt.sign(
      { id: user.id, email, role: user.role || "user", ver },
      process.env.JWT_SECRET,
      { expiresIn: "7d", algorithm: "HS512" }
    );

    const opts = getCookieOptions(req);
    res.cookie("access_token", token, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 روز

    
    res.json({
      message: "Email verified successfully.",
      token,
      user_id: user.id,
      role: user.role || "user",
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ error: "Server error during verification." });
  }
}

/* ================================
   🔁 RESEND CODE
================================== */
export async function resend(req, res) {
  
  const isHuman = await verifyRecaptcha(req.body.recaptchaToken);
  if (!isHuman) {
    return res.status(400).json({ error: "reCAPTCHA verification failed." });
  }
  
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const r = await db.query(
      "SELECT id, is_verified, verification_expires FROM users WHERE email=$1",
      [email]
    );
    if (r.rowCount === 0)
      return res.status(404).json({ error: "No user found" });

    const user = r.rows[0];
    if (user.is_verified)
      return res
        .status(400)
        .json({ error: "User already verified" });

    if (
      user.verification_expires &&
      new Date(user.verification_expires) > new Date()
    ) {
      const remaining = Math.ceil(
        (new Date(user.verification_expires) - new Date()) / 1000
      );
      return res.status(429).json({
        error: `Please wait ${remaining}s before requesting again.`,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expire = new Date(Date.now() + 3 * 60 * 1000);

    await db.query(
      "UPDATE users SET verification_code=$1, verification_expires=$2 WHERE id=$3",
      [hashedCode, expire, user.id]
    );

    await sendVerificationEmail(email, code);
    res.json({ message: "Verification code resent successfully." });
  } catch (err) {
    console.error("RESEND ERROR:", err);
    res.status(500).json({ error: "Server error." });
  }
}


/* ================================
   🔐 LOGIN — Secure Authentication + Agreement Check
================================== */
export async function login(req, res) {
  const { email, password, recaptchaToken } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required." });

  try {
    // 🧩 جستجوی کاربر
    const r = await db.query(
      "SELECT id, email, password_hash, role, is_verified, is_blocked, token_version, failed_logins, last_failed_login, agreed_terms FROM users WHERE email=$1",
      [email]
    );

    if (r.rowCount === 0)
      return res.status(401).json({ error: "Invalid credentials." });

    const user = r.rows[0];

    // 🚫 اکانت بلاک‌شده
    if (user.is_blocked) {
      await recordLoginAttempt({
        userId: user.id,
        email,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        success: false,
      });
      return res.status(403).json({
        error: "Your account has been suspended. Please contact our support team for assistance.",
        blocked: true,
        contact_url: "/contact",
      });
    }


    // 🕒 بررسی قفل موقت (بیش از 10 تلاش در 15 دقیقه)
    if (
      user.failed_logins >= 10 &&
      user.last_failed_login &&
      new Date() - new Date(user.last_failed_login) < 15 * 60 * 1000
    ) {
      return res.status(429).json({
        error:
          "Too many failed attempts. Please wait 15 minutes before trying again.",
      });
    }

    // 🧠 اگر تعداد خطاها >=3 بود باید کپچا بفرستد
    if (user.failed_logins >= 3) {
      if (!recaptchaToken)
        return res
          .status(400)
          .json({ error: "Please complete reCAPTCHA verification." });

      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman)
        return res.status(400).json({ error: "reCAPTCHA verification failed." });
    }

    // 🧩 بررسی رمز عبور
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // 📦 ثبت لاگ تلاش ناموفق
      await recordLoginAttempt({
        userId: user.id,
        email,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        success: false,
      });

      // 🚨 بررسی فعالیت مشکوک
      await monitorSuspiciousIP({
        ip: req.ip,
        email,
        userAgent: req.headers["user-agent"],
        type: "brute_force"
      });

      // 📊 به‌روزرسانی شمارنده خطا و بررسی بلاک
      await handleFailedLogin(user);

      return res.status(401).json({ error: "Invalid email or password." });
    }

    // ✅ بازنشانی شمارنده خطاها
    await db.query(
      `UPDATE users
       SET failed_logins=0, last_failed_login=NULL
       WHERE id=$1`,
      [user.id]
    );

    // 🚫 بررسی تأیید ایمیل
    if (!user.is_verified)
      return res.status(403).json({
        error: "Please verify your email before logging in.",
      });

    // 🚫 بررسی توافقنامه قوانین (مرحله 1)
    if (!user.agreed_terms) {
      // 🟡 صدور JWT موقت فقط برای تأیید قوانین
      const tempToken = jwt.sign(
        {
          id: user.id,
          email,
          role: user.role || "user",
          ver: user.token_version || 0,
          temporary: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "5m", algorithm: "HS512" }
      );

      return res.status(403).json({
        error: "You must review and accept our Terms of Service before continuing.",
        require_terms_agreement: true,
        user_id: user.id,
        temp_token: tempToken,
      });
    }

    // 🚫 بررسی user_consents (مرحله 2)
    const consentCheck = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN choice='accepted' THEN 1 ELSE 0 END) AS accepted
       FROM user_consents WHERE user_id=$1`,
      [user.id]
    );
    const total = parseInt(consentCheck.rows[0].total || 0, 10);
    const accepted = parseInt(consentCheck.rows[0].accepted || 0, 10);
    const all_consents_accepted = total >= 3 && total === accepted;

    if (!all_consents_accepted) {
      return res.status(403).json({
        error: "You must accept our Privacy Policy, Terms of Service, and Cookies Policy.",
        require_terms_agreement: true,
        user_id: user.id,
      });
    }

    // ✅ افزایش نسخه توکن برای بستن سشن‌های قبلی
    const bumpRes = await db.query(
      `UPDATE users
       SET token_version = COALESCE(token_version,0) + 1
       WHERE id=$1
       RETURNING token_version`,
      [user.id]
    );

    const ver = bumpRes.rows[0].token_version;

    // 🧩 ایجاد JWT جدید با نسخه جدید
    const token = jwt.sign(
      { id: user.id, email, role: user.role || "user", ver },
      process.env.JWT_SECRET,
      { expiresIn: "7d", algorithm: "HS512" }
    );

    const opts = getCookieOptions(req);
    res.cookie("access_token", token, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 روز

    // ✅ ثبت لاگ ورود موفق و ریست شمارنده‌ها
    await handleSuccessfulLogin(user, req);
    await recordLoginAttempt({
      userId: user.id,
      email,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
    });
    
    return res.json({
      message: "Login successful.",
      token,
      user_id: user.id,
      role: user.role || "user",
      all_consents_accepted: true,
    });
  
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({ error: "Server error during login." });
      }
    }

/* ================================
   🧾 AGREE TERMS — Update user + consents
================================== */
export async function agreeTerms(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const ip = req.ip || null;
    const ua = req.headers["user-agent"] || null;
    const version = "v1.0";

    // ثبت رضایت برای هر نوع
    const types = ["terms", "privacy", "cookies"];
    for (const type of types) {
      await db.query(
        `INSERT INTO user_consents (user_id, consent_type, version, choice, ip_address, user_agent)
         VALUES ($1,$2,$3,'accepted',$4,$5)
         ON CONFLICT (user_id, consent_type)
         DO UPDATE SET version=$3, choice='accepted', updated_at=NOW()`,
        [userId, type, version, ip, ua]
      );
    }

    await db.query(
      `UPDATE users
       SET agreed_terms=true, agreement_date=NOW()
       WHERE id=$1`,
      [userId]
    );

    res.json({ success: true, message: "Terms accepted successfully." });
  } catch (err) {
    console.error("AGREE TERMS ERROR:", err);
    res.status(500).json({ error: "Server error saving consent." });
  }
}

/* ================================
   🔑 FORGOT PASSWORD (UTC-safe)
================================== */
export async function forgotPassword(req, res) {
  const isHuman = await verifyRecaptcha(req.body.recaptchaToken);
  if (!isHuman) {
    return res.status(400).json({ error: "reCAPTCHA verification failed." });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });

  try {
    const userRes = await db.query(
      "SELECT id, email FROM users WHERE email=$1",
      [email]
    );
    if (userRes.rowCount === 0) {
      return res.json({ message: "If the email exists, we sent a reset link." });
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(24).toString("hex");

    // 🔹 تنظیم زمان انقضا به UTC دقیق
    const { rows } = await db.query(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + interval '5 minutes' AS expires_at`);
    const expiresAt = rows[0].expires_at;


    const ip = req.ip || null;
    const ua = req.headers["user-agent"] || null;

    const requestRes = await db.query(
      `INSERT INTO reset_pass_requests 
         (user_id, email, token, expires_at, ip_address, user_agent, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING id`,
      [user.id, email, token, expiresAt, ip, ua]
    );

    const requestId = requestRes.rows[0].id;

    const emailResult = await sendPasswordResetEmail({ to: email, token });

    await db.query(
      `INSERT INTO reset_pass_emails 
         (reset_request_id, user_id, email, token, status, ip_address, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        requestId,
        user.id,
        email,
        token,
        emailResult.success ? "sent" : "failed",
        ip,
        ua,
        expiresAt,
      ]
    );

    await db.query(
      `UPDATE reset_pass_requests SET status=$1 WHERE id=$2`,
      [emailResult.success ? "sent" : "failed", requestId]
    );

    return res.json({
      message: "If the email exists, we sent a reset link.",
    });
  } catch (err) {
    console.error("FORGOT ERROR:", err);
    res.status(500).json({
      error: "Server error. Please try again later.",
    });
  }
}

/* ================================
   🔍 VALIDATE RESET TOKEN (UTC-safe)
================================== */
export async function validateResetToken(req, res) {
  const { token } = req.params;
  if (!token)
    return res.status(400).json({ valid: false, error: "Missing token" });

  try {
    const result = await db.query(
      `SELECT id, expires_at, used, status 
       FROM reset_pass_requests 
       WHERE token=$1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [token]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ valid: false, error: "Invalid token" });

    const reqRow = result.rows[0];
    const nowUtc = new Date().toISOString();

    // 🔹 بررسی انقضا بر اساس UTC
    const { rows: check } = await db.query(
      `SELECT 
          CASE 
            WHEN expires_at < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN true
            ELSE false
          END AS expired,
          used, status
      FROM reset_pass_requests
      WHERE token=$1
      ORDER BY created_at DESC
      LIMIT 1`,
      [token]
    );

    if (!check.length)
      return res.status(404).json({ valid: false, error: "Invalid token" });

    const row = check[0];

    // ⏰ بررسی انقضا و وضعیت
    if (row.expired || row.used || row.status === "expired" || row.status === "used") {
      return res.status(400).json({
        valid: false,
        error: "Link already used or expired",
      });
    }

    return res.json({ valid: true });



  } catch (err) {
    console.error("VALIDATE TOKEN ERROR:", err);
    res.status(500).json({ valid: false, error: "Server error" });
  }
}

/* ================================
   🔄 RESET PASSWORD (UTC-safe)
================================== */
export async function resetPassword(req, res) {
  const isHuman = await verifyRecaptcha(req.body.recaptchaToken);
  if (!isHuman) {
    return res.status(400).json({ error: "reCAPTCHA verification failed." });
  }

  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword)
    return res.status(400).json({ error: "Missing fields." });
  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match." });

  try {
    const reqRes = await db.query(
      `SELECT * FROM reset_pass_requests 
       WHERE token=$1 AND used=false
       ORDER BY created_at DESC LIMIT 1`,
      [token]
    );

    if (reqRes.rowCount === 0)
      return res.status(400).json({ error: "Invalid or expired link." });

    const request = reqRes.rows[0];
    const nowUtc = new Date().toISOString();

    // 🔹 بررسی دقیق انقضا بر اساس UTC
    const { rows: check } = await db.query(
      `SELECT expires_at < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AS expired 
      FROM reset_pass_requests WHERE id=$1`,
      [request.id]
    );

    if (check[0]?.expired) {
      await db.query(
        `UPDATE reset_pass_requests SET status='expired' WHERE id=$1`,
        [request.id]
      );
      return res.status(400).json({ error: "Reset link expired." });
    }


    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db.query(
      `UPDATE users 
       SET password_hash=$1, 
           token_version=COALESCE(token_version,0)+1,
           is_blocked=false
       WHERE id=$2`,
      [hashed, request.user_id]
    );

    await db.query(
      `UPDATE reset_pass_requests 
       SET used=true, used_at=now(), status='used' WHERE id=$1`,
      [request.id]
    );

    await db.query(
      `UPDATE reset_pass_emails 
       SET status='used', used_at=now() 
       WHERE token=$1`,
      [token]
    );

    res.json({
      success: true,
      message: "Password reset successful. Please log in.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error during reset." });
  }
}

/* ================================
   🔒 PING SESSION — Prevent Multiple Concurrent Logins
================================== */
export async function pingSession(req, res) {
  try {
    const { id, email, role, jwt_version } = req.user;

    // خواندن نسخه‌ی فعلی از دیتابیس
    const { rows } = await db.query(
      "SELECT token_version FROM users WHERE id = $1",
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ ok: false, error: "User not found" });

    const dbVersion = rows[0].token_version || 0;

    // 🔍 بررسی تفاوت نسخه‌ها
    if ((jwt_version || 0) < dbVersion) {
      console.warn(`⚠️ Concurrent login detected for ${email}`);
      return res.status(440).json({
        ok: false,
        error: "Session invalidated. Please log in again.",
        reason: "logged_in_elsewhere",
      });
    }

    // ✅ سشن معتبر
    return res.json({
      ok: true,
      user_id: id,
      email,
      role,
      message: "Session valid",
    });
  } catch (err) {
    console.error("PING ERROR:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
/* ================================
   🔒 CHANGE PASSWORD (Simplified Regex)
================================ */
export async function changePassword(req, res) {

  const isHuman = await verifyRecaptcha(req.body.recaptchaToken);
  if (!isHuman) {
    return res.status(400).json({ error: "reCAPTCHA verification failed." });
  }
  
  const { currentPassword, newPassword, captchaAnswer, captchaExpected } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // 🧠 Captcha check
  if (captchaAnswer?.trim() !== captchaExpected?.trim()) {
    return res.status(400).json({ error: "Captcha answer incorrect." });
  }

  // ✅ simplified regex → letters + numbers, min 8 chars
  const simpleRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!simpleRegex.test(newPassword)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters and include both letters and numbers.",
    });
  }

  try {
    // بررسی پسورد فعلی
    const { rows } = await db.query("SELECT password_hash FROM users WHERE id=$1", [userId]);
    if (!rows.length) return res.status(404).json({ error: "User not found." });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) return res.status(400).json({ error: "Current password is incorrect." });

    // هش و ذخیره رمز جدید
    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.query(
      "UPDATE users SET password_hash=$1, token_version=token_version+1 WHERE id=$2",
      [hashed, userId]
    );

    return res.json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Server error during password update." });
  }
}



/* ================================
   🧠 AUTH ME — بررسی وضعیت فعلی کاربر (کوکی یا هدر)
================================== */
export async function me(req, res) {
  try {
    const { id, email, role } = req.user || {};
    if (!id) return res.status(401).json({ ok: false, error: "Unauthorized" });

    res.json({
      ok: true,
      id,
      email,
      role,
    });
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

