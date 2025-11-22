/*frontend/pages/admin/dashboard.js*/
import { useEffect, useMemo, useState } from "react";
import apiClient from "../../utils/apiClient"; // ✅ نسخه توکن‌دار axios
import AdminLayout from "../../components/admin/AdminLayout";
import StatCard from "../../components/admin/StatCard";

export default function AdminDashboard({ toggleTheme, currentTheme }) {
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchBusinesses();
    fetchUsers();
  }, []);

  /* ───────────── 📦 دریافت بیزینس‌ها ───────────── */
  async function fetchBusinesses() {
    setLoadingBiz(true);
    try {
      const r = await apiClient.get(`/api/admin/businesses`);
      setBusinesses(r.data || []);
    } catch (e) {
      console.error("❌ Error fetching businesses:", e);
    } finally {
      setLoadingBiz(false);
    }
  }

  /* ───────────── 👥 دریافت کاربران ───────────── */
  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const r = await apiClient.get(`/api/admin/users`);
      setUsers(r.data || []);
    } catch (e) {
      console.error("❌ Error fetching users:", e);
    } finally {
      setLoadingUsers(false);
    }
  }

  /* ───────────── 📊 محاسبه آمار ───────────── */
  const stats = useMemo(() => {
    const totalBusinesses = businesses.length;
    const ratings = businesses
      .map((b) => Number(b.avg_rating))
      .filter((v) => !isNaN(v));
    const avgRatings = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
      : "—";
    return { totalBusinesses, avgRatings, totalUsers: users.length };
  }, [businesses, users]);

  /* ───────────── 📋 جدول عمومی ───────────── */
  const Table = ({ title, headers, data, loading }) => (
    <section
      className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] 
      text-[var(--text)] shadow-[5px_5px_15px_var(--shadow-dark),
      -5px_-5px_15px_var(--shadow-light)] transition"
    >
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {loading ? (
        <p className="text-sm opacity-70">Loading...</p>
      ) : data.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="opacity-80 border-b border-[var(--border)]">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left p-3 font-medium uppercase text-xs tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg)]/40 transition"
                >
                  {Object.values(item).map((val, j) => (
                    <td
                      key={j}
                      className="p-3 truncate max-w-[180px]"
                      title={val}
                    >
                      {val || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm opacity-70">No records found.</p>
      )}
    </section>
  );

  /* ───────────── 🖥️ رندر صفحه ───────────── */
  return (
    <AdminLayout toggleTheme={toggleTheme} currentTheme={currentTheme}>
      {/* 📊 Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Businesses" value={stats.totalBusinesses} />
        <StatCard
          title="Average Ratings"
          value={stats.avgRatings}
          subtitle="Across all businesses"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Registered Users"
        />
      </section>

      {/* 🏢 Latest Businesses */}
      <Table
        title="Latest Businesses"
        headers={["Name", "Category", "Country", "City"]}
        loading={loadingBiz}
        data={[...businesses]
          .reverse()
          .slice(0, 5)
          .map((b) => ({
            Name: b.name,
            Category: b.category,
            Country: b.country,
            City: b.city,
          }))}
      />

      {/* 👥 Latest Users */}
      <div className="mt-8">
        <Table
          title="Latest Users"
          headers={["Email", "Role", "Verified", "Created At"]}
          loading={loadingUsers}
          data={[...users]
            .reverse()
            .slice(0, 5)
            .map((u) => ({
              Email: u.email,
              Role: u.role || "User",
              Verified: u.is_verified ? "✅" : "❌",
              "Created At": new Date(u.created_at).toLocaleDateString(),
            }))}
        />
      </div>
    </AdminLayout>
  );
}
