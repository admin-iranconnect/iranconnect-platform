// frontend/pages/_app.js
import '../styles/globals.css';
import '../styles/admin.css';
import '../styles/reactquill.css';
import { useEffect, useState, useRef } from 'react';
import CookieConsent from '../components/CookieConsent';
import AutoLogoutModal from '../components/AutoLogoutModal';
import apiClient from '../utils/apiClient';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const [theme, setTheme] = useState('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inactive, setInactive] = useState(false);
  const timerRef = useRef(null);
  const router = useRouter();

  /* 🚀 تشخیص ورود کاربر از طریق کوکی HttpOnly */
  async function checkLoginByCookie() {
    try {
      const res = await apiClient.get('/auth/me'); // بدون /api ← چون apiClient از BASE_URL استفاده می‌کند
      if (res.data?.ok) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    }
  }

  useEffect(() => {
    checkLoginByCookie();
  }, []);

  /* 🚀 Ping به سرور در هر تغییر مسیر */
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleRouteChange = async () => {
      try {
        await apiClient.get('/auth/ping');
      } catch {
        console.warn("Ping failed on route change");
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [isLoggedIn]);

  /* 🎨 Load theme */
  useEffect(() => {
    const saved = localStorage.getItem('iran_theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  /* 🕒 Auto-logout */
  useEffect(() => {
    if (!isLoggedIn) {
      clearTimeout(timerRef.current);
      setInactive(false);
      return;
    }

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setInactive(true), 2 * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isLoggedIn]);

  /* 🔄 Ping session validity */
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(async () => {
      try {
        await apiClient.get('/auth/ping');
      } catch {}
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  /* 🚪 خروج امن */
  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout'); // تمام از طریق کوکی
    } catch {}

    // پاک‌سازی داخلی
    setIsLoggedIn(false);
    setInactive(false);
    router.push('/auth/login');
  }

  /* 🙋 ادامه حضور */
  function handleStay() {
    setInactive(false);
  }

  /* 🎨 تغییر تم */
  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('iran_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  return (
    <>
      <CookieConsent />

      {isLoggedIn && (
        <AutoLogoutModal
          visible={inactive}
          onStay={handleStay}
          onLogout={handleLogout}
        />
      )}

      <Component
        {...pageProps}
        toggleTheme={toggleTheme}
        currentTheme={theme}
      />
    </>
  );
}
