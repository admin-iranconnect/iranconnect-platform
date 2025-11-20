import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";
import AdminLayout from "../../components/admin/AdminLayout";

export default function AdminSecurityLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  // 🧭 بررسی نقش admin
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

    fetchLogs();
  }, [filter]);

  // 🟢 دریافت لاگ‌ها
  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get(`/api/admin/security-logs`, {
        params: { status: filter || undefined },
      });
      setLogs(res.data || []);
      setFilteredLogs(res.data || []);
    } catch (err) {
      console.error("❌ Error loading logs:", err);
      setError(err.response?.data?.error || "Failed to load security logs.");
    } finally {
      setLoading(false);
    }
  }

  // 🔍 جستجو
  useEffect(() => {
    let list = logs;
    if (search)
      list = list.filter((l) =>
        l.email?.toLowerCase().includes(search.toLowerCase())
      );
    setFilteredLogs(list);
  }, [search, logs]);

  // 📤 خروجی CSV
  function exportToCSV() {
    if (!filteredLogs.length) return;
    const headers = [
      "Email",
      "Status",
      "IP",
      "User Agent",
      "Expires At",
      "Used At",
      "Created At",
    ];
    const rows = filteredLogs.map((l) => [
      l.email,
      l.status,
      l.ip_address || "",
      l.user_agent ? `"${l.user_agent.replace(/"/g, "'")}"` : "",
      l.expires_at ? new Date(l.expires_at).toISOString() : "",
      l.used_at ? new Date(l.used_at).toISOString() : "",
      new Date(l.created_at).toISOString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `IranConnect_Security_Logs_${Date.now()}.csv`;
    a.click();
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-section">
          <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
            <h2 className="admin-title">🔐 Password Reset Logs</h2>
            <button
              onClick={exportToCSV}
              className="admin-btn admin-btn-primary"
              disabled={!filteredLogs.length}
            >
              ⬇️ Export CSV
            </button>
          </div>

          {/* پیام خطا */}
          {error && (
            <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </p>
          )}

          {/* 🔹 فیلتر و جستجو */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="admin-input w-48"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="used">Used</option>
            </select>

            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input w-60"
            />

            <button className="admin-btn admin-btn-secondary" onClick={fetchLogs}>
              Refresh
            </button>
          </div>

          {/* 🔹 جدول داده‌ها */}
          {loading ? (
            <p className="admin-muted">Loading...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="admin-muted">No records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Expires</th>
                    <th>Used</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer"
                    >
                      <td>{log.email}</td>
                      <td className="capitalize">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            log.status === "sent"
                              ? "bg-green-100 text-green-700"
                              : log.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : log.status === "expired"
                              ? "bg-yellow-100 text-yellow-700"
                              : log.status === "used"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td>{log.ip_address || "—"}</td>
                      <td>
                        {log.expires_at
                          ? new Date(log.expires_at).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        {log.used_at
                          ? new Date(log.used_at).toLocaleString()
                          : "—"}
                      </td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(log);
                          }}
                          className="text-turquoise hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 🔹 مودال جزئیات */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            onClick={() => setSelected(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="admin-card w-[90%] max-w-lg p-6"
            >
              <h3 className="text-lg font-semibold mb-3 text-navy">
                Log Details
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {selected.email}</p>
                <p><strong>Status:</strong> <span className="capitalize">{selected.status}</span></p>
                <p><strong>IP:</strong> {selected.ip_address || "—"}</p>
                <p><strong>User Agent:</strong> <span className="opacity-70">{selected.user_agent || "—"}</span></p>
                <p><strong>Expires:</strong> {selected.expires_at ? new Date(selected.expires_at).toLocaleString() : "—"}</p>
                <p><strong>Used:</strong> {selected.used_at ? new Date(selected.used_at).toLocaleString() : "—"}</p>
                <p><strong>Created:</strong> {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right mt-5">
                <button
                  onClick={() => setSelected(null)}
                  className="admin-btn admin-btn-primary px-6"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
