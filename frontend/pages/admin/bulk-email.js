import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import apiClient from "../../utils/apiClient"; // ✅ نسخه امن axios
import AdminLayout from "../../components/admin/AdminLayout";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function BulkEmailPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  // Compose / Send
  const [senderEmail, setSenderEmail] = useState("privacy@iranconnect.org");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Logs
  const [logs, setLogs] = useState([]);

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const previewRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    const role = localStorage.getItem("iran_role");

    // 🧭 فقط ادمین‌ها دسترسی دارند
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    if (role !== "admin" && role !== 'superadmin') {
      window.location.href = "/";
      return;
    }

    fetchLogs();
  }, []);

  // 📜 دریافت لاگ‌ها
  async function fetchLogs(bulkCodeDigits = null) {
    try {
      let url = `/api/admin/bulk-email/logs`;
      if (bulkCodeDigits) url += `?bulk_code=${bulkCodeDigits}`;
      const res = await apiClient.get(url);
      setLogs(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching logs:", err);
    }
  }

  // 🚀 ارسال ایمیل گروهی (با/بدون ضمیمه)
  async function handleSendEmail() {
    if (!subject.trim() || !body.trim()) {
      alert("Please enter subject and body.");
      return;
    }

    setLoading(true);
    try {
      let payload;

      if (attachments.length > 0) {
        payload = new FormData();
        payload.append("sender_email", senderEmail);
        payload.append("subject", subject);
        payload.append("body", body);
        attachments.forEach((file) => payload.append("attachments", file));

        await apiClient.post(`/api/admin/bulk-email/send`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await apiClient.post(`/api/admin/bulk-email/send`, {
          sender_email: senderEmail,
          subject,
          body,
        });
      }

      alert("✅ Emails sent successfully!");
      fetchLogs();
      setSubject("");
      setBody("");
      setAttachments([]);
    } catch (err) {
      console.error("❌ Error sending emails:", err);
      alert(err.response?.data?.error || "❌ Error sending emails");
    }
    setLoading(false);
  }

  // ⬇️ دانلود فایل از URL
  function downloadFrom(url, filename = "") {
    const link = document.createElement("a");
    link.href = url;
    if (filename) link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // 🧩 ساخت URL گزارش فیلترشده
  function buildFilteredReportUrl(filter, value) {
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (value) params.set("value", value.trim());
    return `${API_BASE}/api/admin/bulk-email/report/filter?${params.toString()}`;
  }

  // 🧮 اعتبارسنجی تاریخ DD/MM/YYYY
  function isValidDDMMYYYY(v) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return false;
    const [dd, mm, yyyy] = v.split("/").map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return (
      d.getFullYear() === yyyy &&
      d.getMonth() === mm - 1 &&
      d.getDate() === dd
    );
  }

  // 🧩 مدیریت تولید گزارش فیلترشده
  async function handleGenerateReport() {
    if (!filterType) {
      alert("Please select a filter first.");
      return;
    }

    if (filterType === "bulk_code") {
      if (!filterValue.trim()) {
        alert("Please enter a Bulk Code number.");
        return;
      }
      await fetchLogs(filterValue.trim());
      return;
    }

    if (!filterValue.trim()) {
      alert("Please enter a value for the selected filter.");
      return;
    }

    if (filterType === "date" && !isValidDDMMYYYY(filterValue.trim())) {
      alert("Please enter date as DD/MM/YYYY (e.g. 21/10/2025)");
      return;
    }

    if (
      (filterType === "sender_email" || filterType === "admin_email") &&
      !filterValue.includes("@")
    ) {
      if (!confirm("Value doesn't look like an email. Continue anyway?")) return;
    }

    const url = buildFilteredReportUrl(filterType, filterValue);
    downloadFrom(url);
  }

  // ✂️ کوتاه‌سازی متن
  function truncate(text, length = 25) {
    if (!text) return "-";
    return text.length > length ? text.slice(0, length) + "..." : text;
  }

  // ⚙️ تنظیمات Quill Editor
  const quillModules = {
    toolbar: [
      [{ font: [] }, { size: [] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      ["link", "image"],
      ["clean"],
    ],
  };

  const quillFormats = [
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
  ];

  return (
    <AdminLayout>
      <div className="admin-container">
        {/* === عنوان صفحه === */}
        <div className="mb-6">
          <h1 className="admin-title">📨 Bulk Email Manager</h1>
          <p className="admin-muted">
            Send announcements or policy updates to all users.
          </p>
        </div>

        {/* === فرم ارسال ایمیل === */}
        <section className="admin-section mb-10" style={{ overflow: "visible" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Sender Email */}
            <div>
              <label className="block mb-1 text-sm font-medium">Sender Email</label>
              <select
                className="admin-input"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              >
                <option>privacy@iranconnect.org</option>
                <option>support@iranconnect.org</option>
                <option>info@iranconnect.org</option>
              </select>
            </div>

            {/* Subject */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium">Subject</label>
              <input
                type="text"
                className="admin-input"
                placeholder="Enter subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">
              Attachments (optional)
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setAttachments(Array.from(e.target.files))}
              className="admin-input"
            />
            {attachments.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {attachments.length} file(s) selected
              </p>
            )}
          </div>

          {/* Editor + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="quill-wrapper relative z-[50]">
              <label className="block mb-2 text-sm font-medium">Email Content</label>
              <ReactQuill
                theme="snow"
                value={body}
                onChange={setBody}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your email content here..."
                className="min-h-[300px] text-[var(--text)] bg-[var(--bg)] rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Live Preview</label>
              <div
                ref={previewRef}
                className="admin-card min-h-[300px] overflow-y-auto text-[var(--text)]"
                dangerouslySetInnerHTML={{
                  __html:
                    body || "<p><i>Live preview will appear here...</i></p>",
                }}
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSendEmail}
              disabled={loading}
              className="admin-btn admin-btn-primary"
            >
              {loading ? "Sending..." : "Send Email"}
            </button>
          </div>
        </section>

        {/* === فیلتر گزارش‌ها === */}
        <section className="admin-section mb-6">
          <h2 className="admin-title mb-3">📊 Filter Reports</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            {/* Filter Type */}
            <div>
              <label className="block mb-1 text-sm font-medium">Filter Type</label>
              <select
                className="admin-input"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue("");
                }}
              >
                <option value="">Select a filter...</option>
                <option value="bulk_code">Bulk code</option>
                <option value="sender_email">Sender email</option>
                <option value="admin_email">Admin email</option>
                <option value="date">Date (DD/MM/YYYY)</option>
              </select>
            </div>

            {/* Filter Value */}
            {filterType && (
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium">Value</label>
                <input
                  type="text"
                  placeholder={`Enter ${filterType}...`}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="admin-input"
                />
              </div>
            )}

            <div>
              <button
                onClick={handleGenerateReport}
                className="admin-btn admin-btn-secondary w-full"
              >
                Generate Report
              </button>
            </div>
          </div>
        </section>

        {/* === جدول لاگ‌ها === */}
        <section className="admin-section">
          <h2 className="admin-title mb-3">📋 Sent Email Logs</h2>
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Bulk Code</th>
                  <th>Sender Email</th>
                  <th>Sent Count</th>
                  <th>Date</th>
                  <th>Admin Email</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 opacity-70">
                      No email logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-medium">
                        {log.bulk_code ||
                          `BID-${String(log.id).padStart(6, "0")}`}
                      </td>
                      <td title={log.sender_email}>
                        {truncate(log.sender_email)}
                      </td>
                      <td>
                        {log.sent_count}/{log.total_count}
                      </td>
                      <td>
                        {new Date(log.created_at).toLocaleString("en-GB")}
                      </td>
                      <td
                        className="text-blue-700 font-medium"
                        title={log.admin_email}
                      >
                        {truncate(log.admin_email)}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <a
                            href={`${API_BASE}/api/admin/bulk-email/report/${log.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-secondary"
                          >
                            PDF
                          </a>
                          <a
                            href={`${API_BASE}/api/admin/bulk-email/report/${log.id}/xlsx`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-secondary"
                          >
                            XLSX
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
