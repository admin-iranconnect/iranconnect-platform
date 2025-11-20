// backend/middleware/rateLimit.js
import rateLimit from "express-rate-limit";

/* ==========================================================
   🛡️ Global Rate Limiter — covers all requests
   ========================================================== */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: process.env.RATE_LIMIT_GLOBAL_MAX
    ? parseInt(process.env.RATE_LIMIT_GLOBAL_MAX)
    : 200, // هر IP حداکثر 200 درخواست در 15 دقیقه
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false, // ✅ رفع هشدار امنیتی
  },
});

/* ==========================================================
   🔐 Auth Limiter — login, register, verify, resend, reset
   ========================================================== */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: process.env.RATE_LIMIT_AUTH_MAX
    ? parseInt(process.env.RATE_LIMIT_AUTH_MAX)
    : 10, // حداکثر 10 درخواست در 15 دقیقه از هر IP
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false, // ✅ رفع هشدار امنیتی
  },
});

/* ==========================================================
   📩 Forgot Password Limiter — to prevent abuse
   ========================================================== */
export const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: process.env.RATE_LIMIT_FORGOT_MAX
    ? parseInt(process.env.RATE_LIMIT_FORGOT_MAX)
    : 5, // حداکثر 5 درخواست در 15 دقیقه از هر IP
  message: {
    message: "If the email exists, we sent a reset link.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false, // ✅ رفع هشدار امنیتی
  },
});
