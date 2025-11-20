//frontend/components/ProfileMenu.jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import apiClient from '../utils/apiClient'; // ✅ اضافه شد برای /me

export default function ProfileMenu({ role, hasClaim }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const menuRef = useRef(null);

  // 🧩 گرفتن ایمیل از JWT یا کوکی HttpOnly
  useEffect(() => {
    async function fetchEmail() {
      try {
        // ✅ تلاش برای گرفتن اطلاعات از سرور (کوکی HttpOnly)
        const res = await apiClient.get('/api/auth/me', { withCredentials: true });
        if (res.data?.email) {
          setEmail(res.data.email);
          return;
        }
      } catch (err) {
        // ⚠️ اگر کوکی نداشتیم → fallback به localStorage
        if (err.response?.status === 401 || !err.response) {
          try {
            const token = localStorage.getItem('iran_token');
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setEmail(payload.email || '');
            }
          } catch (e) {
            console.warn('Invalid token');
          }
        }
      }
    }
    fetchEmail();
  }, []);

  // 🧩 بستن منو با کلیک بیرون
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const logout = () => {
    // فعلاً فقط پاک کردن localStorage (مرحله بعد: clearCookie + full logout)
    localStorage.removeItem('iran_token');
    localStorage.removeItem('iran_role');
    window.location.href = '/';
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* آیکون پروفایل */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] hover:scale-[1.05] transition"
        aria-label="Profile Menu"
      >
        <User size={18} className="text-turquoise" />
      </button>

      {/* منوی بازشونده */}
      {menuOpen && (
        <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] p-3 z-50">
          {/* ایمیل کاربر */}
          <p className="text-sm text-[var(--text)] mb-3 truncate">{email}</p>

          {/* ✅ فقط اگر کاربر بیزینس‌کلیم داشته باشد */}
          {hasClaim && (
            <>
              <a
                href="/account/requests"
                className="block text-sm text-turquoise hover:underline mb-2"
              >
                Requests / History
              </a>

              {/* 🧩 زیرمنوی مدیریت بیزینس */}
              <div className="border-t border-[var(--border)] my-2"></div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                Business Management
              </p>
              <a
                href="/account/update-business"
                className="block text-sm text-[var(--text)] hover:text-turquoise mb-1"
              >
                ✏️ Update Business
              </a>
              <a
                href="/account/delete-business"
                className="block text-sm text-[var(--text)] hover:text-turquoise mb-1"
              >
                🗑️ Delete Business
              </a>
              <a
                href="/account/new-business"
                className="block text-sm text-[var(--text)] hover:text-turquoise mb-2"
              >
                🆕 Add New Business
              </a>
            </>
          )}

          <div className="border-t border-[var(--border)] my-2"></div>

          {/* لینک داشبورد ادمین */}
          {(role === 'admin' || role === 'superadmin') && (
            <a
              href="/admin/dashboard"
              className="block text-sm text-turquoise hover:underline mb-2"
            >
              Admin Dashboard
            </a>
          )}
          
          {/* تغییر رمز عبور */}
          <a
            href="/account/change-password"
            className="block text-sm text-turquoise hover:underline mb-2"
          >
            Change Password
          </a>

          {/* خروج */}
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:underline w-full text-left"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

