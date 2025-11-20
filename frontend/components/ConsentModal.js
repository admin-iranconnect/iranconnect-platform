import { useState, useEffect } from "react";
import axios from "axios";

export default function ConsentModal({ userId, lang, onClose }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  // 🎨 هماهنگی خودکار با تم فعلی سایت (Light / Dark)
  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute("data-theme");
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const texts = {
    en: {
      title: "Before continuing",
      desc: "Please review and accept our Privacy Policy, Terms of Service, and Cookies Policy.",
      agree: "I agree to all the above policies.",
      button: "Accept & Continue",
    },
    fa: {
      title: "پیش از ادامه",
      desc: "لطفاً سیاست‌های حریم خصوصی، شرایط استفاده و سیاست کوکی‌ها را مطالعه و تأیید کنید.",
      agree: "تمام سیاست‌های فوق را مطالعه کرده و می‌پذیرم.",
      button: "تأیید و ادامه",
    },
  };
  const t = texts[lang] || texts.en;

  // 🧩 ارسال رضایت کاربر
  const submitConsent = async () => {
    if (!checked) return alert("Please confirm agreement first.");
    setLoading(true);

    const token = localStorage.getItem("iran_token");
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

    // 🚫 اگر توکن وجود ندارد یا منقضی شده است
    if (!token) {
      alert("⚠️ Session expired. Please log in again.");
      window.location.href = "/auth/login";
      return;
    }

    try {
      await axios.post(
        `${base}/api/auth/agree-terms`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ موفقیت در ثبت رضایت
      onClose(true);
    } catch (err) {
      console.error("Consent save error:", err);
      if (err.response?.status === 403) {
        alert("⚠️ Session expired. Please log in again.");
        window.location.href = "/auth/login";
      } else {
        alert("Error saving consent. Please try again.");
      }
    }

    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background:
          theme === "dark"
            ? "rgba(10, 29, 55, 0.85)" // پس‌زمینه نیمه‌شفاف در تم تیره
            : "rgba(0, 0, 0, 0.6)",
        direction: lang === "fa" ? "rtl" : "ltr",
      }}
    >
      <div
        className="rounded-2xl shadow-xl p-8 w-full max-w-md text-center transition-all duration-300 border"
        style={{
          background: theme === "dark" ? "var(--card-bg)" : "var(--bg)",
          color: "var(--text)",
          borderColor: "var(--border)",
          boxShadow:
            theme === "dark"
              ? "10px 10px 25px rgba(0,0,0,0.6), -10px -10px 25px rgba(255,255,255,0.05)"
              : "6px 6px 15px rgba(0,0,0,0.1), -6px -6px 15px rgba(255,255,255,0.4)",
        }}
      >
        {/* عنوان و توضیحات */}
        <h2 className="text-2xl font-semibold mb-4">{t.title}</h2>
        <p
          className="text-sm mb-4"
          style={{
            color:
              theme === "dark"
                ? "rgba(255,255,255,0.85)"
                : "rgba(10,29,55,0.85)",
          }}
        >
          {t.desc}
        </p>

        {/* لینک‌های قوانین */}
        <div className="text-sm mb-4 space-x-1">
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-turquoise underline mx-1"
          >
            Privacy Policy
          </a>
          •
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="text-turquoise underline mx-1"
          >
            Terms of Service
          </a>
          •
          <a
            href="/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="text-turquoise underline mx-1"
          >
            Cookies
          </a>
        </div>

        {/* تیک تایید قوانین */}
        <label
          className="block text-sm mb-4"
          style={{
            color: theme === "dark" ? "#e9f1f1" : "var(--text)",
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mr-2 accent-turquoise"
          />
          {t.agree}
        </label>

        {/* دکمه ارسال */}
        <button
          onClick={submitConsent}
          disabled={!checked || loading}
          className="py-2 px-6 rounded-lg font-medium shadow hover:bg-turquoise/90 transition"
          style={{
            background: "var(--turquoise)",
            color: "var(--navy)",
            opacity: !checked || loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : t.button}
        </button>
      </div>
    </div>
  );
}
