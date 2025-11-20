import { useRouter } from "next/router";

export default function Topbar({ toggleTheme, currentTheme }) {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("iran_token");
    localStorage.removeItem("iran_role");
    router.push("/auth/login");
  }

  return (
    <div className="bg-[var(--bg)] border-b border-[var(--border)] sticky top-0 z-40 shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between">
        {/* عنوان */}
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Dashboard</h1>
          <p className="text-sm text-gray-500">Manage IranConnect data</p>
        </div>

        {/* دکمه‌ها */}
        <div className="flex items-center gap-3">
          {/* تغییر تم */}
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:scale-[1.03] transition"
          >
            {currentTheme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          {/* خروج */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded-lg bg-turquoise text-white shadow-[4px_4px_10px_#b8e0dd,-4px_-4px_10px_#ffffff] hover:bg-turquoise/90 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
