// backend/utils/verifyRecaptcha.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

/**
 * ✅ Universal Google reCAPTCHA verifier (v2 + v3 support)
 * @param {string} token - token دریافتی از سمت کاربر
 * @returns {Promise<boolean>} نتیجه اعتبارسنجی (true = human, false = bot)
 */
export async function verifyRecaptcha(token) {
  if (!token) return false;

  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    const data = await response.json();

    // ✅ اگر reCAPTCHA نوع v3 بود، score وجود دارد
    if (data.success && typeof data.score !== "undefined") {
      return data.score >= 0.4;
    }

    // ✅ اگر reCAPTCHA نوع v2 است، فقط success وجود دارد
    return data.success === true;
  } catch (err) {
    console.error("❌ Error verifying reCAPTCHA:", err.message);
    return false;
  }
}
