// frontend/pages/admin/file-logs.js
import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";
import AdminLayout from "../../components/admin/AdminLayout";
import FileLogDetailsModal from "../../components/admin/FileLogDetailsModal";

export default function AdminFileLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (status) params.status = status;
      if (source) params.source = source;
      const res = await apiClient.get("/admin/files/logs", { params });
      setLogs(res.data || []);
    } catch (err) {
      console.error("❌ Fetch logs error:", err);
      setError(err.response?.data?.error || "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <section className="admin-section">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-5">
            🧾 File Upload Logs
          </h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <select
              className="admin-input w-40"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="clean">Clean</option>
              <option value="error">Error</option>
              <option value="infected">Infected</option>
            </select>

            <input
              type="text"
              placeholder="Search by source..."
              className="admin-input w-60"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />

            <button
              onClick={fetchLogs}
              className="admin-btn admin-btn-primary text-sm px-4 py-2"
            >
              Search
            </button>
            <button
                onClick={() => {
                    setSource("");
                    setStatus("");
                    fetchLogs();
                }}
                className="admin-btn admin-btn-secondary text-sm px-4 py-2"
            >
                Clear
            </button>
            {/* 📤 Export Buttons */}
            <div className="flex flex-row flex-wrap gap-3 items-center ml-auto">
            {/* 📊 Export XLSX */}
            <button
                onClick={() => {
                const token = localStorage.getItem("iran_token");
                const url = `${
                    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
                }/api/admin/files/export/xlsx?token=${token}`;
                window.open(url, "_blank");
                }}
                className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
            >
                Export XLSX
            </button>

            {/* 🧾 Export PDF */}
            <button
                onClick={() => {
                const token = localStorage.getItem("iran_token");
                const url = `${
                    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
                }/api/admin/files/export/pdf?token=${token}`;
                window.open(url, "_blank");
                }}
                className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
            >
                Export PDF
            </button>
            </div>
          </div>


          
          {error && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm opacity-70">Loading logs...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>User</th>
                    <th>Scanned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-3">{log.file_name}</td>
                        <td
                          className={`p-3 font-medium ${
                            log.scan_status === "clean"
                              ? "text-green-600"
                              : log.scan_status === "infected"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {log.scan_status}
                        </td>
                        <td className="p-3 truncate max-w-[120px]">
                          {log.upload_source || "—"}
                        </td>
                        <td className="p-3 truncate max-w-[120px]">
                          {log.user_email || "—"}
                        </td>
                        <td className="p-3">
                          {new Date(log.scanned_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="admin-btn admin-btn-secondary text-xs px-3 py-1"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center opacity-70 p-4">
                        No logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedLog && (
        <FileLogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </AdminLayout>
  );
}
