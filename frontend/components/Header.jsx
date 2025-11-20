//frontend/components/Header.jsx
'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProfileMenu from './ProfileMenu';
import apiClient from '../utils/apiClient'; // ✅ نسخه امن axios با interceptor

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState('light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasClaim, setHasClaim] = useState(false);
  const [email, setEmail] = useState('');
  
/* 🧩 بررسی وضعیت کاربر و بیزینس کلیم */
useEffect(() => {
  async function checkAuth() {
    try {
      // ✅ بررسی وضعیت لاگین از طریق کوکی HttpOnly
      const me = await apiClient.get('/api/auth/me', { withCredentials: true });
      if (me?.data?.ok) {
        setIsLoggedIn(true);
        const role = me.data.role || 'user';
        setIsAdmin(role === 'admin' || role === 'superadmin');
        setEmail(me.data.email || '');
        return; // ✅ اگر موفق شد، ادامه نده
      }
    } catch (err) {
      // 🟡 اگر کوکی معتبر نبود → fallback به localStorage
      if (err.response?.status === 401) {
        const token = localStorage.getItem('iran_token');
        const role = localStorage.getItem('iran_role');
        if (token) setIsLoggedIn(true);
        if (token && (role === 'admin' || role === 'superadmin')) setIsAdmin(true);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setEmail(payload.email || '');
        } catch {}
      }
    }
  }

  checkAuth();

    // ✅ بررسی بیزینس کلیم (همان منطق قبلی)
    apiClient
      .get(`/api/business-claims/my`, { withCredentials: true })
      .then((res) => {
        if (res.data && res.data.some((c) => c.status === 'verified')) {
          setHasClaim(true);
        }
      })
      .catch(() => {
        // interceptor خودش مدیریت می‌کند (logout / redirect در صورت خطاهای امنیتی)
      });

    // 🎨 بارگذاری تم ذخیره‌شده
    const savedTheme =
      localStorage.getItem('iran_theme') ||
      document.documentElement.getAttribute('data-theme') ||
      'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setTheme(savedTheme);

    // نظارت بر تغییر تم
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute('data-theme');
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  /* 🌗 تغییر تم */
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('iran_theme', newTheme);
    setTheme(newTheme);
  };

  /* 🚪 خروج کاربر */
  const handleLogout = async () => {
    try {
      // ✅ ابتدا تلاش برای خروج سروری (کوکی HttpOnly)
      await apiClient.post('/api/auth/logout', {}, { withCredentials: true });
    } catch {
      // در صورت خطا یا نبود کوکی، از localStorage پاک کن
    }

    // پاک‌سازی localStorage (fallback)
    localStorage.removeItem('iran_token');
    localStorage.removeItem('iran_role');
    sessionStorage.clear();
    window.location.href = '/';
  };

  return (
    <header className="site-header shadow-sm border-b border-[var(--border)] bg-[var(--bg)] transition">
      <div className="container-mobile flex flex-wrap items-center justify-between py-3 px-4 md:px-6 gap-3">
        {/* ✅ Logo */}
        <Link
          href="/"
          className="font-bold text-turquoise text-xl md:text-2xl flex items-center gap-3"
        >
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="IranConnect"
            className="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg transition-all duration-300"
          />
        </Link>

        {/* === Desktop Nav === */}
        <nav className="hidden md:flex gap-5 items-center">
          <Link
            href="/"
            className="text-sm text-[var(--text)] hover:text-turquoise transition"
          >
            Home
          </Link>
          <Link
            href="/contact"
            className="text-sm text-[var(--text)] hover:text-turquoise transition"
          >
            Contact
          </Link>
          <Link
            href="/about"
            className="text-sm text-[var(--text)] hover:text-turquoise transition"
          >
            About
          </Link>

          {!isLoggedIn && (
            <Link
              href="/auth/login"
              className="text-sm text-[var(--text)] hover:text-turquoise transition"
            >
              Login
            </Link>
          )}

          {/* 🧩 Profile Menu */}
          {isLoggedIn && (
            <ProfileMenu role={isAdmin ? 'admin' : 'user'} hasClaim={hasClaim} />
          )}

          {/* 🌙☀️ Theme toggle */}
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:scale-[1.03] transition"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </nav>

        {/* === Mobile Nav === */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] hover:scale-[1.03] transition"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* 🍔 Hamburger menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-[var(--text)] focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  menuOpen
                    ? 'M6 18L18 6M6 6l12 12'
                    : 'M4 6h16M4 12h16M4 18h16'
                }
              />
            </svg>
          </button>
        </div>
      </div>

      {/* === Mobile dropdown menu === */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--bg)] border-t border-[var(--border)] flex flex-col px-6 py-4 space-y-3 shadow-md">
          {/* 📧 نمایش ایمیل کاربر بالای منو (فقط موبایل) */}
          {isLoggedIn && email && (
            <div className="pb-2 border-b border-[var(--border)] mb-2">
              <p className="text-sm font-medium text-turquoise truncate">{email}</p>
            </div>
          )}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="text-[var(--text)] hover:text-turquoise"
          >
            Home
          </Link>
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="text-[var(--text)] hover:text-turquoise"
          >
            Contact
          </Link>
          <Link
            href="/about"
            onClick={() => setMenuOpen(false)}
            className="text-[var(--text)] hover:text-turquoise"
          >
            About
          </Link>

          {!isLoggedIn && (
            <Link
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="text-[var(--text)] hover:text-turquoise"
            >
              Login
            </Link>
          )}

          {isLoggedIn && (
            <>
              {/* ✅ درخواست‌ها */}
              {hasClaim && (
                <>
                  <Link
                    href="/account/requests"
                    onClick={() => setMenuOpen(false)}
                    className="text-[var(--text)] hover:text-turquoise"
                  >
                    Requests / History
                  </Link>

                  <div className="border-t border-[var(--border)] my-2"></div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Business Management
                  </p>
                  <Link
                    href="/account/update-business"
                    onClick={() => setMenuOpen(false)}
                    className="text-[var(--text)] hover:text-turquoise"
                  >
                    ✏️ Update Business
                  </Link>
                  <Link
                    href="/account/delete-business"
                    onClick={() => setMenuOpen(false)}
                    className="text-[var(--text)] hover:text-turquoise"
                  >
                    🗑️ Delete Business
                  </Link>
                  <Link
                    href="/account/new-business"
                    onClick={() => setMenuOpen(false)}
                    className="text-[var(--text)] hover:text-turquoise"
                  >
                    🆕 Add New Business
                  </Link>
                </>
              )}

              <div className="border-t border-[var(--border)] my-2"></div>

              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="text-[var(--text)] hover:text-turquoise"
                >
                  Admin Dashboard
                </Link>
              )}
              
              
              <Link
                href="/account/change-password"
                onClick={() => setMenuOpen(false)}
                className="text-[var(--text)] hover:text-turquoise"
              >
                Change Password
              </Link>

              <button
                onClick={handleLogout}
                className="text-left text-red-500 text-[var(--text)] hover:text-turquoise"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

