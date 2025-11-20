// frontend/pages/admin/blocked-ips.js
import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../utils/apiClient";
import BlockedIPDetailsModal from "../../components/admin/BlockedIPDetailsModal";

export default function AdminBlockedIPs() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    ip: "",
    status: "",
  });

  const [selectedIP, setSelectedIP] = useState(null);

  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    fetchBlockedIPs(1);
  }, []);

  async function fetchBlockedIPs(newPage = page) {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: newPage,
        pageSize: 10,
      };

      const res = await apiClient.get("/api/admin/blocked-ips", { params });

      setList(res.data?.data || []);
      setPagination(
        res.data?.pagination || {
          page: newPage,
          pageSize: 10,
          total: (res.data?.data || []).length,
          totalPages: 1,
        }
      );

      setPage(newPage);
    } catch (err) {
      console.error("Failed to fetch blocked IPs:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleExport(format) {
    const token = localStorage.getItem("iran_token");
    window.open(
      `${base}/api/admin/blocked-ips/export/${format}?token=${token}`,
      "_blank"
    );
  }

  function handleSearch() {
    fetchBlockedIPs(1);
  }

  function handleClear() {
    setFilters({ ip: "", status: "" });
    fetchBlockedIPs(1);
  }

  function goToPage(newPage) {
    if (
      newPage < 1 ||
      newPage > (pagination.totalPages || 1) ||
      newPage === page
    )
      return;
    fetchBlockedIPs(newPage);
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <section className="admin-section">

          <h2 className="admin-title mb-5">🚫 Blocked IP Addresses</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">

            <input
              className="admin-input w-48"
              placeholder="Filter by IP"
              value={filters.ip}
              onChange={(e) =>
                setFilters({ ...filters, ip: e.target.value })
              }
            />

            <select
              className="admin-input w-40"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All Status</option>
              <option value="blocked">Blocked</option>
              <option value="unblocked">Unblocked</option>
            </select>

            <button
              onClick={handleSearch}
              className="admin-btn admin-btn-primary px-4 py-2 text-sm font-medium"
            >
              Search
            </button>

            <button
              onClick={handleClear}
              className="admin-btn admin-btn-secondary px-4 py-2 text-sm font-medium"
            >
              Clear
            </button>

            <div className="flex flex-row gap-2 ml-auto">
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

          {/* Table */}
          {loading ? (
            <p className="text-sm opacity-70">Loading blocked IPs...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>IP</th>
                      <th>Status</th>
                      <th>Blocked At</th>
                      <th>Blocked By</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {list.length ? (
                      list.map((item) => (
                        <tr key={item.id}>
                          <td className="truncate max-w-[150px]">
                            {item.ip_address}
                          </td>

                          <td className="truncate max-w-[100px]">
                            {item.status}
                          </td>

                          <td className="truncate max-w-[160px]">
                            {item.blocked_at
                              ? new Date(item.blocked_at).toLocaleString()
                              : "—"}
                          </td>

                          <td className="truncate max-w-[150px]">
                            {item.automatic
                              ? "🤖 Automatic system"
                              : (item.blocked_by_email || "—")}
                          </td>

                          <td className="text-right">
                            <button
                              onClick={() => setSelectedIP(item)}
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
                          No record found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 text-sm">
                <div>
                  Page {pagination.page} of {pagination.totalPages}{" "}
                  {pagination.total > 0 && (
                    <span className="opacity-70">
                      ({pagination.total} records)
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    className="admin-btn admin-btn-secondary px-3 py-1"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                  >
                    ◀ Prev
                  </button>
                  <button
                    className="admin-btn admin-btn-secondary px-3 py-1"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= (pagination.totalPages || 1)}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </>
          )}

          {selectedIP && (
            <BlockedIPDetailsModal
              ipRecord={selectedIP}
              onClose={() => setSelectedIP(null)}
              refreshList={() => fetchBlockedIPs(page)}
            />
          )}

        </section>
      </div>
    </AdminLayout>
  );
}
