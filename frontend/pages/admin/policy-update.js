'use client';
import { useState, useEffect } from "react";
import apiClient from "../../utils/apiClient"; // ✅ axios امن با JWT
import AdminLayout from "../../components/admin/AdminLayout";

export default function PolicyUpdatePage() {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // 🧭 بررسی نقش admin
  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    const role = localStorage.getItem("iran_role");

    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    if (role !== "admin") {
      window.location.href = "/";
      return;
    }
  }, []);

  // 🚀 ارسال ایمیل گروهی برای بروزرسانی سیاست‌ها
  const handleSend = async () => {
    setLoading(true);
    setMsg("");
    setError("");

    try {
      const res = await apiClient.post(`/admin/send-policy-update`, { lang });
      setMsg(res.data.message || "✅ Policy update emails sent successfully!");
    } catch (err) {
      console.error("❌ Error sending emails:", err);
      setError(err.response?.data?.error || "Failed to send policy update emails.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <main className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-full max-w-lg border border-[var(--border)] bg-[var(--card-bg)] 
          rounded-2xl shadow-[5px_5px_15px_var(--shadow-dark),-5px_-5px_15px_var(--shadow-light)] p-8 transition">
          
          <h2 className="text-xl font-semibold text-[var(--text)] text-center mb-6">
            📬 Send Policy Update Email
          </h2>

          {/* انتخاب زبان */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-[var(--text)] opacity-80">
              Select email language:
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-turquoise"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="fa">فارسی</option>
            </select>
          </div>

          {/* دکمه ارسال */}
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-3 bg-turquoise text-navy font-semibold rounded-lg shadow hover:bg-turquoise/90 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Policy Update"}
          </button>

          {/* نمایش پیام‌ها */}
          {msg && (
            <p className="mt-4 text-green-600 bg-green-50 border border-green-200 rounded-md p-2 text-sm text-center">
              {msg}
            </p>
          )}
          {error && (
            <p className="mt-4 text-red-600 bg-red-50 border border-red-200 rounded-md p-2 text-sm text-center">
              {error}
            </p>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
