//frontend/pages/admin/login-attempts.js
import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../utils/apiClient";
import LoginAttemptDetailsModal from "../../components/admin/LoginAttemptDetailsModal";

export default function AdminLoginAttemptsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [blockedOnly, setBlockedOnly] = useState(false);


  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (status) params.status = status;
      if (blockedOnly) params.blocked = "true";
      if (email) params.email = email;

      const res = await apiClient.get("/api/admin/login-attempts/all", { params });
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error("❌ Fetch login attempts error:", err);
      setError(err.response?.data?.error || "Failed to load login logs.");
    } finally {
      setLoading(false);
    }
  }

  function handleExport(type) {
    const token = localStorage.getItem("iran_token");
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
    window.open(`${base}/api/admin/login-attempts/export/${type}?token=${token}`, "_blank");
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <section className="admin-section">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-5">
            🔐 User Login Attempts
          </h2>

          {/* 🔍 Filters */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <select
              className="admin-input w-40"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
            </select>

            <input
              type="text"
              placeholder="Search by email..."
              className="admin-input w-60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              onClick={fetchLogs}
              className="admin-btn admin-btn-primary text-sm px-4 py-2"
            >
              Search
            </button>

            <button
              onClick={() => {
                setEmail("");
                setStatus("");
                fetchLogs();
              }}
              className="admin-btn admin-btn-secondary text-sm px-4 py-2"
            >
              Clear
            </button>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={blockedOnly}
                onChange={(e) => setBlockedOnly(e.target.checked)}
              />
              <span className="text-sm text-[var(--text)]">Only Blocked Users</span>
            </label>

            {/* 📤 Export Buttons */}
            <div className="flex flex-row flex-wrap gap-3 items-center ml-auto">
              <button
                onClick={() => handleExport("xlsx")}
                className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
              >
                Export XLSX
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* ⚠️ Error Message */}
          {error && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </p>
          )}

          {/* 📋 Logs Table */}
          {loading ? (
            <p className="text-sm opacity-70">Loading login logs...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>IP</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-3 truncate max-w-[180px]">{log.email}</td>
                        <td className="p-3 truncate max-w-[150px]">{log.ip_address}</td>
                        <td className="p-3">
                          {log.success ? (
                            <span className="text-green-600 font-medium">Success</span>
                          ) : (
                            <span className="text-red-600 font-medium">Failed</span>
                          )}
                        </td>
                        <td className="p-3 truncate max-w-[180px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedAttempt(log)}
                            className="admin-btn admin-btn-secondary text-xs px-3 py-1"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center opacity-70 p-4">
                        No login attempts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ✅ Modal for Viewing Details */}
          {selectedAttempt && (
            <LoginAttemptDetailsModal
              attempt={selectedAttempt}
              onClose={() => setSelectedAttempt(null)}
            />
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
