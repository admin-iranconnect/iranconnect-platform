// frontend/components/admin/AdminLayout.jsx

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import apiClient from "../../utils/apiClient";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);         // ← برای Loading Screen
  const [authorized, setAuthorized] = useState(false);  // ← نقش admin/superadmin

  /* -------------------------------------------------------
     🟦 1) بررسی سشن با /auth/me (سیستم جدید HttpOnly)
  ---------------------------------------------------------*/
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await apiClient.get("/auth/me", {
        withCredentials: true,
      });

      if (!res?.data?.role) {
        router.push("/auth/login");
        return;
      }

      if (res.data.role !== "admin" && res.data.role !== "superadmin") {
        router.push("/");
        return;
      }

      setAuthorized(true);
    } catch (err) {
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------
     🎨 2) مدیریت تم
  ---------------------------------------------------------*/
  useEffect(() => {
    const saved = localStorage.getItem("iran_theme") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("iran_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }

  /* -------------------------------------------------------
     🎬 3) Loading Screen حرفه‌ای ایران کانکت
  ---------------------------------------------------------*/
  if (loading) {
    return (
      <div
        className="
        flex items-center justify-center min-h-screen 
        bg-[var(--bg)] text-[var(--text)]
      "
      >
        <div className="text-center">
          {/* لوگو بر اساس تم */}
          <img
            src={theme === "dark" ? "/logo-light.png" : "/logo-dark.png"}
            alt="IranConnect Logo"
            className="w-28 h-28 mx-auto mb-6 animate-pulse drop-shadow-lg"
          />

          <div className="text-2xl font-semibold tracking-wide mb-3">
            IranConnect Admin
          </div>

          <div className="text-sm opacity-70">
            Verifying session, please wait…
          </div>

          {/* اسپیتر ساده */}
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-t-transparent border-turquoise rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     🟢 4) اگر همه چیز OK بود → پنل را نمایش بده
  ---------------------------------------------------------*/
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex transition-colors">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar toggleTheme={toggleTheme} currentTheme={theme} />

        <main className="admin-main transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
