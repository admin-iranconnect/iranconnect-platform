import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";
import AdminLayout from "../../components/admin/AdminLayout";
import RequestDetailsModal from "../../components/admin/RequestDetailsModal";

export default function AdminBusinessRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

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

    fetchRequests(1);
  }, [statusFilter, typeFilter]);

  // 📦 دریافت درخواست‌ها
  async function fetchRequests(p = 1) {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: p,
        limit,
        status: statusFilter,
        type: typeFilter,
        q: searchTerm.trim() || undefined,
      };
      const res = await apiClient.get(`/admin/requests`, { params });
      setRequests(res.data.rows || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error("❌ Error fetching requests:", err);
      setError(err.response?.data?.error || "Failed to load requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  // 📤 خروجی XLSX
  async function handleExportXLSX() {
    try {
      const res = await apiClient.get(`/admin/requests/export/xlsx`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IranConnect_Requests_Report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error exporting XLSX file.");
    }
  }

  // 🧾 خروجی PDF
  async function handleExportPDF() {
    try {
      const res = await apiClient.get(`/admin/requests/export/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IranConnect_Requests_Report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error exporting PDF file.");
    }
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-section">
          <h2 className="admin-title mb-4">
            🧾 Business Requests (New / Update / Delete)
          </h2>

          {/* پیام خطا */}
          {error && (
            <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </p>
          )}

          {/* 🔎 فیلتر و جستجو */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchRequests(1);
            }}
            className="flex flex-wrap items-center gap-3 mb-6"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search business, email, or ticket..."
              className="admin-input w-56"
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="admin-input w-40"
            >
              <option value="">All Types</option>
              <option value="new">New</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-input w-40"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button type="submit" className="admin-btn admin-btn-primary text-sm px-5 py-2">
              Search
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("");
                setStatusFilter("");
                setPage(1);
                fetchRequests(1);
              }}
              className="admin-btn admin-btn-secondary text-sm px-4 py-2"
            >
              Clear
            </button>

            {/* 📤 Export */}
            <div className="flex flex-row flex-wrap gap-3 items-center ml-auto">
              <button
                className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
                onClick={handleExportXLSX}
                type="button"
              >
                Export XLSX
              </button>
              <button
                className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
                onClick={handleExportPDF}
                type="button"
              >
                Export PDF
              </button>
            </div>
          </form>

          {/* جدول */}
          {loading ? (
            <p className="admin-muted">Loading...</p>
          ) : !Array.isArray(requests) || requests.length === 0 ? (
            <p className="admin-muted">No matching requests found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Ticket</th>
                      <th>Created</th>
                      <th>Processed</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id}>
                        <td className="max-w-[120px] truncate" title={r.business_name}>
                          {r.business_name || "—"}
                        </td>
                        <td className="max-w-[150px] truncate">{r.user_email || "—"}</td>
                        <td className="capitalize">{r.request_type}</td>
                        <td>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              r.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : r.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="font-mono">{r.ticket_code}</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td>
                          {r.processed_at
                            ? new Date(r.processed_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          <button
                            className="admin-btn admin-btn-secondary text-sm px-3 py-1"
                            onClick={() => setSelected(r)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > limit && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => fetchRequests(page - 1)}
                    className="admin-btn admin-btn-secondary text-sm px-3 py-1 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="admin-muted">
                    Page {page} of {Math.ceil(total / limit)}
                  </span>
                  <button
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => fetchRequests(page + 1)}
                    className="admin-btn admin-btn-secondary text-sm px-3 py-1 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* مودال جزئیات */}
      {selected && (
        <RequestDetailsModal
          request={selected}
          token={localStorage.getItem("iran_token")}
          onClose={() => setSelected(null)}
          refresh={() => fetchRequests(page)}
        />
      )}
    </AdminLayout>
  );
}
