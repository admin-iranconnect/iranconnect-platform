// frontend/components/admin/Sidebar.jsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const groupedNav = [
  {
    label: "Overview",
    icon: "🏠",
    items: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    label: "Businesses",
    icon: "🏢",
    items: [
      { href: "/admin/businesses", label: "All Businesses" },
      { href: "/admin/add", label: "Add New" },
      { href: "/admin/claims", label: "Claims" },
      { href: "/admin/requests", label: "Requests" },
      { href: "/admin/contact-requests", label: "Contact Requests" },
    ],
  },
  {
    label: "Users",
    icon: "👥",
    items: [
      { href: "/admin/users", label: "Manage Users" },
      { href: "/admin/consents", label: "User Consents" },
    ],
  },
  {
    label: "Policies & Emails",
    icon: "📜",
    items: [
      { href: "/admin/policies", label: "Policies" },
      { href: "/admin/bulk-email", label: "Bulk Email" },
    ],
  },
  {
    label: "Security",
    icon: "🛡️",
    items: [
      { href: "/admin/security-logs", label: "Security Logs" },
      { href: "/admin/file-logs", label: "File Logs" },
      { href: "/admin/login-attempts", label: "Login Logs" },
      {
        label: "Suspicious IPs",
        href: "/admin/suspicious-ips",
        children: [
          { href: "/admin/blocked-ips", label: "Blocked IPs" },
        ],
      },
    ],
  },

  {
    label: "Settings",
    icon: "⚙️",
    items: [{ href: "/admin/settings", label: "System Settings" }],
  },
];

export default function Sidebar() {
  const { pathname } = useRouter();
  const [theme, setTheme] = useState("light");
  const [openGroup, setOpenGroup] = useState(null);

  // 🔥 تعداد آی‌پی‌های مشکوک با وضعیت NOT BLOCKED
  const [unblockedCount, setUnblockedCount] = useState(0);
  const [hasSuspiciousIPs, setHasSuspiciousIPs] = useState(false);

  const [openSubGroup, setOpenSubGroup] = useState(null);

  /* ===========================
     🔎 دریافت تعداد آی‌پی‌های NOT BLOCKED
     =========================== */
  useEffect(() => {
    fetchSuspiciousCount();
  }, []);

  async function fetchSuspiciousCount() {
    try {
      const token = localStorage.getItem("iran_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/admin/suspicious-ips/count-unblocked`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      setUnblockedCount(data.count);
      setHasSuspiciousIPs(data.count > 0);
    } catch (err) {
      console.warn("Failed to fetch suspicious IP count:", err);
    }
  }

  /* ===========================
     🎨 تم روشن/تاریک
     =========================== */
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);

    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute("data-theme");
      setTheme(newTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggleGroup = (label) => {
    setOpenGroup(openGroup === label ? null : label);
  };

  return (
    <aside
      className="
        hidden md:flex md:flex-col w-60 min-h-screen
        sticky top-0 self-start
        bg-[var(--card-bg)] border-r border-[var(--border)]
        text-[var(--text)] shadow-[4px_0_12px_var(--shadow-dark)]
        transition
      "
    >
      {/* Header */}
      <div className="px-6 py-6 border-b border-[var(--border)] flex items-center gap-4">
        <img
          src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
          alt="IranConnect Logo"
          className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg transition-all duration-300"
        />
        <div className="font-semibold text-[var(--color-text)] text-xl md:text-2xl tracking-wide">
          Admin
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {groupedNav.map((group) => (
          <div key={group.label} className="mb-3">
            
            {/* Parent Item */}
            <button
              onClick={() => toggleGroup(group.label)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                openGroup === group.label
                  ? "bg-turquoise/20 text-turquoise shadow-inner"
                  : "text-[var(--text)] hover:bg-turquoise/10 hover:text-turquoise"
              }`}
            >

              <span className="flex items-center gap-2">
                <span>{group.icon}</span>
                <span>{group.label}</span>

                {/* 🔥 عدد کنار Security وقتی بسته است */}
                {group.label === "Security" &&
                  openGroup !== "Security" &&
                  unblockedCount > 0 && (
                    <span
                      className="
                        ml-2 text-[10px] bg-red-600 text-white
                        px-2 py-0.5 rounded-full
                      "
                    >
                      {unblockedCount}
                    </span>
                  )}
              </span>

              <span className="text-xs">
                {openGroup === group.label ? "▲" : "▼"}
              </span>
            </button>

            {/* Child Items */}
            {openGroup === group.label && (
              <div className="ml-6 mt-2 border-l border-[var(--border)] pl-2">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const isSuspiciousGroup = item.href === "/admin/suspicious-ips";

                  // اگر آیتمی چایلد دارد (مثل Suspicious IPs)
                  if (item.children) {
                    const isOpen = openSubGroup === item.label;

                    return (
                      <div key={item.href} className="mb-1">

                        <div
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                            isOpen || active
                              ? "bg-turquoise/30 text-turquoise"
                              : "text-[var(--text)] hover:bg-turquoise/10 hover:text-turquoise"
                          }`}
                        >
                          {/* ✔️ نام و لینک صفحه اصلی Suspicious IPs */}
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 flex-1"
                          >
                            <span>{item.label}</span>

                            {/* 🔥 عدد کنار Suspicious IPs وقتی Security باز است */}
                            {item.href === "/admin/suspicious-ips" &&
                              unblockedCount > 0 && (
                                <span
                                  className="
                                    ml-2 text-[10px] bg-red-600 text-white
                                    px-2 py-0.5 rounded-full
                                  "
                                >
                                  {unblockedCount}
                                </span>
                              )}
                          </Link>

                          {/* ✔️ دکمه باز/بسته کردن زیرمنو */}
                          <button
                            onClick={() => setOpenSubGroup(isOpen ? null : item.label)}
                            className="text-xs px-2 py-1"
                          >
                            {isOpen ? "▲" : "▼"}
                          </button>
                        </div>

                        {/* زیرمنوها */}
                        {isOpen && (
                          <div className="ml-4 mt-1 border-l border-[var(--border)] pl-2">
                            {item.children.map((child) => {
                              const childActive = pathname.startsWith(child.href);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`block px-2 py-1.5 rounded-md text-sm mb-1 transition-all ${
                                    childActive
                                      ? "bg-turquoise/30 text-turquoise"
                                      : "text-[var(--text)] hover:bg-turquoise/10 hover:text-turquoise"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // سایر آیتم‌ها
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-2 py-1.5 rounded-md text-sm mb-1 transition-all ${
                        active
                          ? "bg-turquoise/30 text-turquoise"
                          : "text-[var(--text)] hover:bg-turquoise/10 hover:text-turquoise"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span>{item.label}</span>

                        {/* 🔥 عدد کنار Suspicious IPs وقتی Security بسته است */}
                        {isSuspiciousGroup &&
                          unblockedCount > 0 && (
                            <span
                              className="
                                ml-2 text-[10px] bg-red-600 text-white
                                px-2 py-0.5 rounded-full
                              "
                            >
                              {unblockedCount}
                            </span>
                          )}
                      </span>
                    </Link>
                  );
                })}

              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 text-xs text-[var(--text)]/70 border-t border-[var(--border)]">
        IranConnect v1.0
      </div>
    </aside>
  );
}
