import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function RequestHistory() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filters, setFilters] = useState({
    business: "",
    ticket: "",
    created: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

  // 🎨 تم
  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute("data-theme");
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // 📦 واکشی درخواست‌ها
  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const token = localStorage.getItem("iran_token");
      const res = await axios.get(`${API_BASE}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data || [];
      setRequests(data);
      setFilteredRequests(data.slice(0, 5)); // ✅ فقط ۵ مورد آخر
    } catch (err) {
      console.error(err);
      setError("Unable to load requests.");
    }
    setLoading(false);
  }

  // 🔍 فیلتر درخواست‌ها
  function handleSearch(e) {
    e.preventDefault();
    const { business, ticket, created } = filters;
    const results = requests.filter((r) => {
      const matchesBusiness =
        !business ||
        r.business_name?.toLowerCase().includes(business.toLowerCase());
      const matchesTicket =
        !ticket ||
        r.ticket_code?.toLowerCase().includes(ticket.toLowerCase());
      const matchesCreated =
        !created ||
        new Date(r.created_at).toLocaleDateString("en-GB") === created;
      return matchesBusiness && matchesTicket && matchesCreated;
    });
    setFilteredRequests(results);
  }

  // 🧹 پاک کردن فیلترها
  function clearFilters() {
    setFilters({ business: "", ticket: "", created: "" });
    setFilteredRequests(requests.slice(0, 5));
  }

  const inputClass =
    "p-2 rounded-lg border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-turquoise transition-all duration-200 " +
    (theme === "dark"
      ? "bg-[#153b78] text-white placeholder-gray-300"
      : "bg-[#f5f7fa] text-gray-900 placeholder-gray-500");

  const cardStyle = {
    background: theme === "dark" ? "#0b2149" : "#ffffff",
    color: theme === "dark" ? "#ffffff" : "#0a1b2a",
    borderColor:
      theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    boxShadow:
      theme === "dark"
        ? "10px 10px 25px rgba(0,0,0,0.4), -10px -10px 25px rgba(255,255,255,0.05)"
        : "6px 6px 15px rgba(0,0,0,0.1), -6px -6px 15px rgba(255,255,255,0.4)",
  };

  const closeModal = () => setSelectedRequest(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <Header />
      <main className="flex-1 px-4 py-10 w-full max-w-5xl mx-auto">
        <div
          className="rounded-2xl p-6 border transition-all duration-300"
          style={cardStyle}
        >
          <h1 className="text-2xl font-semibold text-center mb-6">
            📋 My Business Requests
          </h1>

          {/* 🔎 نوار جستجو */}
          
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 items-end"
          >
            {/* Business */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">Business</label>
              <input
                type="text"
                value={filters.business}
                onChange={(e) => setFilters({ ...filters, business: e.target.value })}
                className={inputClass + " w-full"}
                placeholder="Enter business name"
              />
            </div>

            {/* Ticket */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">
                Ticket <span className="text-xs text-gray-400">(e.g. IC-BU0000002)</span>
              </label>
              <input
                type="text"
                value={filters.ticket}
                onChange={(e) => setFilters({ ...filters, ticket: e.target.value })}
                className={inputClass + " w-full"}
                placeholder="Ticket code"
              />
            </div>

            {/* Created */}
            <div className="w-full">
              <label className="block text-sm font-medium mb-1">
                Created <span className="text-xs text-gray-400">(DD/MM/YYYY)</span>
              </label>
              <input
                type="text"
                value={filters.created}
                onChange={(e) => setFilters({ ...filters, created: e.target.value })}
                className={inputClass + " w-full"}
                placeholder="e.g. 27/10/2025"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 w-full md:w-auto sm:col-span-1">
              <button
                type="submit"
                className="flex-1 bg-turquoise text-[#0b2149] py-2 rounded-lg font-medium hover:bg-turquoise/90 transition-all"
              >
                Search
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 bg-gray-300 text-[#0b2149] py-2 rounded-lg font-medium hover:bg-gray-400 transition-all"
              >
                Clear
              </button>
            </div>
          </form>
          {/* 📱 نسخه موبایل */}
          <div className="grid gap-4 md:hidden">
            {loading ? (
              <p className="text-center">Loading...</p>
            ) : error ? (
              <p className="text-center text-red-500">{error}</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-center text-gray-500">No matching requests found.</p>
            ) : (
              filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="border rounded-xl p-4 text-center shadow-sm"
                  style={{
                    background: theme === "dark" ? "#102b5b" : "#f5f7fa",
                  }}
                >
                  <h2 className="text-lg font-semibold text-turquoise mb-1">
                    {req.business_name || "—"}
                  </h2>
                  <p className="text-sm text-white-600 mb-1 capitalize">
                    Type: {req.request_type}
                  </p>
                  <p className="text-sm text-white-600 mb-1 font-mono">
                    Ticket: {req.ticket_code}
                  </p>
                  <p className="text-sm text-white-600 mb-1">
                    Created: {new Date(req.created_at).toLocaleDateString("en-GB")}
                  </p>
                  <p
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-1 ${
                      req.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : req.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {req.status}
                  </p>
                  <p className="text-sm text-white-600 mb-1">
                    Processed:{" "}
                    {req.processed_at
                      ? new Date(req.processed_at).toLocaleDateString("en-GB")
                      : "—"}
                  </p>
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="text-turquoise font-medium mt-1 hover:underline"
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 💻 نسخه دسکتاپ */}
          <div
            className="hidden md:block overflow-x-auto rounded-xl shadow-md"
            style={{
              background: theme === "dark" ? "#0b2149" : "#ffffff",
              color: theme === "dark" ? "#f0f4ff" : "#0a1b2a",
            }}
          >
            <table className="min-w-full text-sm text-center">
              <thead
                style={{
                  background: "var(--turquoise)",
                  color: "#ffffff",
                }}
              >
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Processed</th>
                  <th className="px-4 py-3">Admin Note</th>
                  <th className="px-4 py-3">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className={`border-b transition-colors ${
                      theme === "dark"
                        ? "hover:bg-[#102b5b]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-turquoise">
                      {req.business_name?.length > 25
                        ? req.business_name.slice(0, 25) + "..."
                        : req.business_name || "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{req.request_type}</td>
                    <td className="px-4 py-3 font-mono">{req.ticket_code}</td>
                    <td className="px-4 py-3">
                      {new Date(req.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          req.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : req.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {req.processed_at
                        ? new Date(req.processed_at).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 max-w-[180px] truncate ${
                        theme === "dark" ? "text-gray-200" : "text-gray-600"
                      }`}
                      title={req.admin_note || "—"}
                    >
                      {req.admin_note || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="text-turquoise font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 📄 مودال جزئیات */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              className="rounded-2xl max-w-lg w-full p-6 relative"
              style={{
                background: theme === "dark" ? "#0b2149" : "#ffffff",
                color: theme === "dark" ? "#ffffff" : "#0a1b2a",
              }}
            >
              <button
                onClick={() => setSelectedRequest(null)}
                className="absolute top-3 right-4 text-turquoise text-lg font-bold"
              >
                ✖
              </button>
              <h2 className="text-xl font-semibold text-center mb-4">
                📄 Request Details
              </h2>
              <div className="space-y-2 text-sm">
                <p><strong>Business:</strong> {selectedRequest.business_name || "—"}</p>
                <p><strong>Type:</strong> {selectedRequest.request_type}</p>
                <p><strong>Ticket:</strong> {selectedRequest.ticket_code}</p>
                <p><strong>Created:</strong> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                <p><strong>Status:</strong> {selectedRequest.status}</p>
                <p><strong>Processed:</strong> {selectedRequest.processed_at
                  ? new Date(selectedRequest.processed_at).toLocaleString()
                  : "—"}
                </p>
                <p><strong>Admin Note:</strong></p>
                <div className="p-3 border rounded-lg max-h-48 overflow-y-auto bg-white/30 text-gray-700 dark:text-gray-200">
                  {selectedRequest.admin_note || "No note provided."}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
