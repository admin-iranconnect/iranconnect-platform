// frontend/utils/apiClient.js
import axios from "axios";

// آدرس بک‌اند
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// یک نمونه اختصاصی axios می‌سازیم
const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// helper: خروج کامل + پیام امنیتی
function forceLogoutAndRedirect(message) {
  try {
    localStorage.removeItem("iran_token");
    localStorage.removeItem("iran_role");
    sessionStorage.clear();

    if (message) {
      localStorage.setItem("iran_security_msg", message);
    }
  } catch (e) {
    console.warn("cleanup failed", e);
  }

  window.location.href = "/auth/login";
}

// هر درخواست قبل از ارسال → اگر توکن داریم، بفرستیم تو هدر
apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = true;
    return config;
  },
  (err) => Promise.reject(err)
);

// هر پاسخ از سرور
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) return Promise.reject(error);

    const { status, data } = error.response;

    if (status === 423) {
      forceLogoutAndRedirect(
        "Your account was temporarily locked due to unusual activity. Please change your password or contact support."
      );
      return Promise.reject(error);
    }

    if (status === 440 || data?.reason === "logged_in_elsewhere") {
      forceLogoutAndRedirect(
        "We detected a new login to your account from another device."
      );
      return Promise.reject(error);
    }

    if (status === 403 && data?.error === "Session invalidated. Please log in again.") {
      forceLogoutAndRedirect("Your session is no longer valid. Please log in again.");
      return Promise.reject(error);
    }

    if (status === 401 && data?.error?.toLowerCase().includes("expired")) {
      forceLogoutAndRedirect("Your session expired. Please log in again.");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
