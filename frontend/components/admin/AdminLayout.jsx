import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [theme, setTheme] = useState('light');

  // ✅ بررسی نقش ادمین و ورود (حالا شامل superadmin هم هست)
  useEffect(() => {
    const token = localStorage.getItem('iran_token');
    const role = localStorage.getItem('iran_role');

    // اگر لاگین نکرده
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // اگر نقش غیرمجاز است (یعنی نه admin و نه superadmin)
    if (role !== 'admin' && role !== 'superadmin') {
      router.push('/');
      return;
    }
  }, [router]);

  // ✅ بارگذاری تم از localStorage
  useEffect(() => {
    const saved = localStorage.getItem('iran_theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // ✅ تغییر تم
  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('iran_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex transition-colors">
      <Sidebar />

      {/* 🧭 محتوای اصلی با فاصله‌های استاندارد */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar toggleTheme={toggleTheme} currentTheme={theme} />

        {/* همه صفحات داخل این محدوده با فاصله‌های هماهنگ */}
        <main className="admin-main transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
