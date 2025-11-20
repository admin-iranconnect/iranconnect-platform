// frontend/utils/apiClient.js
import axios from "axios";

// آدرس بک‌اند
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// یک نمونه اختصاصی axios می‌سازیم
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // ✅ برای ارسال کوکی‌های HttpOnly بین دامنه‌ها
});

// helper: خروج کامل + پیام امنیتی
function forceLogoutAndRedirect(message) {
  try {
    // پاک کردن توکن‌ها
    localStorage.removeItem("iran_token");
    localStorage.removeItem("iran_role");
    sessionStorage.clear();

    // پیام امنیتی رو نگه می‌داریم تا توی صفحه لاگین به کاربر نمایش بدیم
    if (message) {
      localStorage.setItem("iran_security_msg", message);
    }
  } catch (e) {
    console.warn("cleanup failed", e);
  }

  // ریدایرکت به صفحه لاگین
  window.location.href = "/auth/login";
}

// هر درخواست قبل از ارسال → اگر توکن داریم، بفرستیم تو هدر
apiClient.interceptors.request.use(
  (config) => {
    // ✅ اطمینان از ارسال کوکی‌ها در هر درخواست
    config.withCredentials = true;

    // ✅ تغییر جدید: فقط در صورت نبود کوکی HttpOnly، از localStorage استفاده کن
    const hasCookie = typeof document !== "undefined" && document.cookie.includes("access_token=");
    if (!hasCookie) {
      const token = localStorage.getItem("iran_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (err) => Promise.reject(err)
);

// هر پاسخ از سرور
apiClient.interceptors.response.use(
  (response) => response, // حالت OK
  (error) => {
    // اگر هیچ response ای نیست (قطع اینترنت مثلا)
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // 🔐 سناریو ۱: حساب قفل شده به خاطر رفتار مشکوک
    if (status === 423) {
      forceLogoutAndRedirect(
        "Your account was temporarily locked due to unusual activity. Please change your password or contact support."
      );
      return Promise.reject(error);
    }

    // 🔐 سناریو ۲: سشن باطل شده چون جای دیگه لاگین شدیم
    if (status === 440 || data?.reason === "logged_in_elsewhere") {
      forceLogoutAndRedirect(
        "We detected a new login to your account from another device. If this was you, you can safely ignore this message."
      );
      return Promise.reject(error);
    }

    // 🔐 سناریو ۳: نسخه توکن دیگه معتبر نیست (توکن قدیمی)
    if (status === 403 && data?.error === "Session invalidated. Please log in again.") {
      forceLogoutAndRedirect(
        "Your session is no longer valid. Please log in again."
      );
      return Promise.reject(error);
    }

    // 🔐 سناریو ۴: توکن منقضی شده
    if (status === 401 && data?.error?.toLowerCase().includes("expired")) {
      forceLogoutAndRedirect(
        "Your session expired. Please log in again."
      );
      return Promise.reject(error);
    }

    // بقیه خطاها رو فقط پاس بده
    return Promise.reject(error);
  }
);

export default apiClient;
