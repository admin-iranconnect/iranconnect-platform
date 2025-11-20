//frontend/pages/admin/businesses.js
import { useEffect, useState, useMemo } from "react";
import apiClient from "../../utils/apiClient"; // ✅ axios با interceptor
import AdminLayout from "../../components/admin/AdminLayout";

export default function BusinessesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // 🧭 بررسی نقش و توکن قبل از بارگذاری
  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    const role = localStorage.getItem("iran_role");

    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    if (role !== "admin" && role !== 'superadmin') {
      window.location.href = "/";
      return;
    }

    fetchBusinesses();
  }, []);

  // 📦 دریافت لیست بیزینس‌ها
  async function fetchBusinesses(search = "") {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/businesses`, {
        params: { q: search },
      });
      setList(res.data || []);
    } catch (e) {
      console.error("❌ Error fetching businesses:", e);
    } finally {
      setLoading(false);
    }
  }

  // 🔍 جستجو
  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    await fetchBusinesses(query);
    setSearching(false);
  }

  // ❌ حذف بیزینس
  async function deleteBusiness(id) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this business?"
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/api/admin/businesses/${id}`);
      setList((prev) => prev.filter((b) => b.id !== id));
      alert("✅ Business deleted successfully.");
    } catch (e) {
      console.error("❌ Delete error:", e);
      alert(e.response?.data?.error || "Failed to delete business.");
    }
  }

  // ✂️ کوتاه‌سازی متن
  const truncate = (text, length = 20) => {
    if (!text) return "—";
    return text.length > length ? text.slice(0, length) + "..." : text;
  };

  // 🧱 جدول داده‌ها
  const Table = useMemo(
    () => (
      <section
        className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)]
        shadow-[5px_5px_15px_var(--shadow-dark),-5px_-5px_15px_var(--shadow-light)] transition overflow-x-auto"
      >
        <table className="min-w-full text-sm">
          <thead className="opacity-80">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Country</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr
                key={b.id}
                className="border-t border-[var(--border)] hover:bg-[var(--bg)]/40 transition"
              >
                <td className="p-3 opacity-70">{b.id}</td>
                <td className="p-3">
                  <span title={b.name}>{truncate(b.name, 25)}</span>
                </td>
                <td className="p-3">
                  <span title={b.category}>{truncate(b.category, 20)}</span>
                </td>
                <td className="p-3">
                  <span title={b.country}>{truncate(b.country, 10)}</span>
                </td>
                <td className="p-3">
                  <span title={b.city}>{truncate(b.city, 12)}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <a
                      href={`/admin/edit/${b.id}`}
                      className="text-turquoise hover:underline"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => deleteBusiness(b.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && !loading && (
              <tr>
                <td colSpan="6" className="text-center p-4 opacity-70">
                  No businesses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    ),
    [list, loading]
  );

  return (
    <AdminLayout>
      {/* 🏷 عنوان و نوار جستجو */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Businesses Management
        </h2>

        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search by name, city or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg)] text-[var(--text)] 
            focus:outline-none focus:ring-2 focus:ring-turquoise sm:w-64"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-turquoise text-navy font-medium rounded shadow 
            hover:bg-turquoise/90 transition disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* 📋 جدول */}
      {loading ? (
        <p className="text-[var(--text)] text-sm opacity-70">
          Loading businesses...
        </p>
      ) : (
        Table
      )}
    </AdminLayout>
  );
}
