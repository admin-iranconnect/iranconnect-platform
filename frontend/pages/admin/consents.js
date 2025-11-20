import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient"; // ✅ axios امن با interceptor
import AdminLayout from "../../components/admin/AdminLayout";

export default function AdminConsentsPage() {
  const [consents, setConsents] = useState([]);
  const [filteredConsents, setFilteredConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 🧭 بررسی نقش و توکن قبل از بارگذاری صفحه
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

    fetchConsents();
  }, []);

  // 🟢 دریافت داده‌ها
  async function fetchConsents() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/consents`);
      setConsents(res.data || []);
      setFilteredConsents(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching consents:", err);
      alert(err.response?.data?.error || "Failed to fetch consent logs.");
    } finally {
      setLoading(false);
    }
  }

  // 🔍 جستجو و فیلتر
  useEffect(() => {
    let list = consents;
    if (filterType)
      list = list.filter((c) => c.consent_type === filterType);
    if (searchTerm)
      list = list.filter((c) =>
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setFilteredConsents(list);
  }, [filterType, searchTerm, consents]);

  // 📤 خروجی XLSX
  async function handleExportXLSX() {
    try {
      const res = await apiClient.get(`/api/admin/consents/export/xlsx`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IranConnect_User_Consents.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ XLSX export failed:", err);
      alert("Failed to export Excel file.");
    }
  }

  // 🧾 خروجی PDF
  async function handleExportPDF() {
    try {
      const res = await apiClient.get(`/api/admin/consents/export/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IranConnect_User_Consents.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ PDF export failed:", err);
      alert("Failed to export PDF file.");
    }
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-section">
          <h2 className="admin-title mb-4">🧾 User Consents Log</h2>

          {/* 🔹 فیلتر + جستجو + خروجی‌ها */}
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="admin-input w-48"
            >
              <option value="">All Types</option>
              <option value="terms">Terms of Service</option>
              <option value="privacy">Privacy Policy</option>
              <option value="cookies">Cookies Policy</option>
            </select>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user email..."
              className="admin-input w-60"
            />

            <button
              className="admin-btn admin-btn-primary"
              onClick={fetchConsents}
            >
              Refresh
            </button>

            {/* 🟢 دکمه‌های خروجی */}
            <button
              className="admin-btn bg-green-600 hover:bg-green-700"
              onClick={handleExportXLSX}
            >
              📊 Export XLSX
            </button>
            <button
              className="admin-btn bg-turquoise hover:bg-turquoise/90"
              onClick={handleExportPDF}
            >
              🧾 Export PDF
            </button>
          </div>

          {/* 🔹 جدول اصلی */}
          {loading ? (
            <p className="admin-muted">Loading...</p>
          ) : filteredConsents.length === 0 ? (
            <p className="admin-muted">No consent records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Consent Type</th>
                    <th>Version</th>
                    <th>Choice</th>
                    <th>IP Address</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsents.map((c) => (
                    <tr key={c.id}>
                      <td>{c.email}</td>
                      <td className="capitalize">{c.consent_type}</td>
                      <td>{c.version}</td>
                      <td
                        className={`font-semibold ${
                          c.choice === "accepted"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {c.choice}
                      </td>
                      <td>{c.ip_address || "—"}</td>
                      <td>{new Date(c.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
