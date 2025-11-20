// frontend/components/AutoLogout.js
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";

/**
 * 🕒 AutoLogout Component — IranConnect
 * 
 * خروج خودکار بعد از ۳ دقیقه inactivity
 * فعالیت شامل: کلیک، اسکرول، کیبورد، تاچ
 */

export default function AutoLogout({ timeout = 180000 }) {
  const router = useRouter();
  const timerRef = useRef(null);

  // تابع خروج کامل
  const logoutUser = () => {
    console.warn("🔒 Auto-logout: user inactive for 3 minutes");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    router.push("/auth/login");
  };

  // ریست تایمر هنگام فعالیت کاربر
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logoutUser, timeout);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];

    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer(); // شروع تایمر در بدو ورود

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
