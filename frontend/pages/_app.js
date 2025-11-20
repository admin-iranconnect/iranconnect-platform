//frontend/pages/_app.js
import '../styles/globals.css';
import '../styles/admin.css';
import '../styles/reactquill.css';
import { useEffect, useState, useRef } from 'react';
import CookieConsent from '../components/CookieConsent';
import AutoLogoutModal from '../components/AutoLogoutModal';
import axios from 'axios';
import apiClient from '../utils/apiClient';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const [theme, setTheme] = useState('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inactive, setInactive] = useState(false);
  const timerRef = useRef(null);
  const router = useRouter();

  /* 🚀 Ping به سرور در هر تغییر مسیر */
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleRouteChange = async (url) => {
      try {
        // درخواست سبک برای بررسی اعتبار توکن
        await apiClient.get('/api/auth/ping');
      } catch (err) {
        // اگر سشن منقضی یا از جای دیگه لاگین شده باشه،
        // interceptor مرکزی خودش logout می‌کنه
        console.warn('Ping failed on route change:', err?.message);
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [isLoggedIn]);
  
  /* 🎨 Load theme */
  useEffect(() => {
    const saved = localStorage.getItem('iran_theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  /* 🔐 Detect login via iran_token (مثل Header.jsx) */
  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem('iran_token');
      const valid =
        token &&
        token !== 'undefined' &&
        token !== 'null' &&
        token.trim() !== '';

      setIsLoggedIn(!!valid);
    };

    // بررسی اولیه و در صورت تغییر localStorage
    checkLogin();
    window.addEventListener('storage', checkLogin);

    return () => window.removeEventListener('storage', checkLogin);
  }, []);

  /* 🕒 Auto-logout فقط وقتی کاربر لاگین کرده */
  useEffect(() => {
    if (!isLoggedIn) {
      clearTimeout(timerRef.current);
      setInactive(false);
      return;
    }

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setInactive(true), 2 * 60 * 1000); // 3 دقیقه
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [isLoggedIn]);

  /* 🔄 Ping session validity to detect logout from another device */
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(async () => {
      try {
        await apiClient.get('/api/auth/ping');
        // اگر موفق بود → ساکت بمان
      } catch (err) {
        console.warn('Session check failed — likely logged in elsewhere.');
        // apiClient interceptor خودش logout و redirect را انجام می‌دهد
      }
    }, 60000); // هر ۶۰ ثانیه (برای تست می‌تونی 10000 بزاری)

    return () => clearInterval(interval);
  }, [isLoggedIn]);
  
  
  /* 🚪 خروج امن */
  async function handleLogout() {
    try {
      clearTimeout(timerRef.current);
      setInactive(false);
      const token = localStorage.getItem('iran_token');
      if (token) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.warn('Logout failed:', err.message);
    }
    localStorage.removeItem('iran_token');
    localStorage.removeItem('iran_role');
    sessionStorage.clear();
    setIsLoggedIn(false);
    window.location.href = '/auth/login';
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

      {/* 🕒 فقط وقتی لاگین کرده */}
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
