'use client';
import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { RotateCw } from "lucide-react";

export default function DeleteBusinessRequest() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [theme, setTheme] = useState("light");
  const [humanQ, setHumanQ] = useState("");
  const [humanA, setHumanA] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [msg, setMsg] = useState("");
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
  const token = typeof window !== "undefined" ? localStorage.getItem("iran_token") : null;

  // ✅ کپچا
  const generateHumanQuestion = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setHumanQ(`${a} + ${b} = ?`);
    setCorrectAnswer(a + b);
  };
  useEffect(() => generateHumanQuestion(), []);
  const refreshCaptcha = () => generateHumanQuestion();

  // 🎨 تم
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
    const obs = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute("data-theme");
      setTheme(newTheme);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // 🧩 واکشی بیزینس‌ها
  useEffect(() => {
    if (!token) return (window.location.href = "/auth/login");
    axios
      .get(`${API_BASE}/api/requests/owned-businesses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setBusinesses(res.data || []))
      .catch(() => setBusinesses([]));
  }, []);

  // ✅ لایو ولیدیشن
  const validateField = (name, value) => {
    let error = "";
    if (name === "customReason" && reason === "other" && !value.trim())
      error = "Please specify your reason.";
    if (name === "description" && value.length > 0 && value.length < 10)
      error = "Description must be at least 10 characters.";
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (field, value) => {
    if (field === "reason") setReason(value);
    if (field === "customReason") setCustomReason(value);
    if (field === "description") setDescription(value);
    validateField(field, value);
  };

  // 📤 ارسال فرم حذف
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(""); setTicket("");
    const hasErrors = Object.values(errors).some((e) => e);
    if (hasErrors) return setMsg("⚠️ Please fix validation errors before submitting.");
    if (!confirm) return setMsg("Please confirm that your information is accurate.");
    if (humanA.trim() !== String(correctAnswer)) return setMsg("Human verification failed.");
    if (!selectedBusiness) return setMsg("Please select a verified business.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("request_type", "delete");
      fd.append("business_id", selectedBusiness);
      fd.append("payload", JSON.stringify({
        reason: reason === "other" ? customReason : reason,
        description,
      }));

      const res = await axios.post(`${API_BASE}/api/requests`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setMsg("✅ Your delete request has been submitted successfully!");
      setTicket(res.data.ticket_code);
      setTimeout(() => window.location.reload(), 10000);      
      setReason(""); setCustomReason(""); setDescription("");
      setErrors({});
      setConfirm(false); refreshCaptcha();
    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.error || "Error submitting request.");
    }
    setLoading(false);
  }

  const cardStyle = {
    background: theme === "dark" ? "#0b2149" : "#ffffff",
    color: theme === "dark" ? "#ffffff" : "#0a1b2a",
    borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    boxShadow: theme === "dark"
      ? "10px 10px 25px rgba(0,0,0,0.4), -10px -10px 25px rgba(255,255,255,0.05)"
      : "6px 6px 15px rgba(0,0,0,0.1), -6px -6px 15px rgba(255,255,255,0.4)",
  };
  const inputClass =
    "w-full p-3 rounded-lg border shadow-inner focus:outline-none focus:ring-2 focus:ring-turquoise transition-all duration-200 " +
    (theme === "dark"
      ? "bg-[#153b78] text-white placeholder-gray-300 border-gray-600"
      : "bg-[#f5f7fa] text-gray-900 border-gray-300 placeholder-gray-500");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ffffff" }}>
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-2xl p-8 w-full max-w-xl border transition-all duration-300" style={cardStyle}>
          <h2 className="text-2xl font-semibold text-center mb-6">🗑️ Request Business Deletion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Select Business */}
            <div>
              <label className="block font-medium mb-1">Business Name</label>
              <select value={selectedBusiness} onChange={(e) => setSelectedBusiness(e.target.value)}
                className={`${inputClass} appearance-none pr-8`} required>
                {businesses.length === 0
                  ? <option>No verified businesses found</option>
                  : <>
                      <option value="">Select a business...</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                      ))}
                    </>
                }
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block font-medium mb-1">Reason for Deletion</label>
              <select value={reason} onChange={(e) => handleChange("reason", e.target.value)}
                className={`${inputClass} appearance-none pr-8`} required>
                <option value="">Select reason...</option>
                <option value="closed">Business permanently closed</option>
                <option value="not_owner">I am not the owner/manager</option>
                <option value="other">Other</option>
              </select>
            </div>

            {reason === "other" && (
              <div>
                <input type="text" placeholder="Enter your reason" value={customReason}
                  onChange={(e) => handleChange("customReason", e.target.value)}
                  className={`${inputClass} ${errors.customReason ? "border-red-500" : ""}`} />
                {errors.customReason && <p className="text-red-400 text-sm mt-1">{errors.customReason}</p>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block font-medium mb-1">Notes for Admin</label>
              <textarea rows={3} value={description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={`${inputClass} ${errors.description ? "border-red-500" : ""}`}
                placeholder="Explain any details for the admin..." />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Confirm + Captcha */}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              I confirm that the information above is accurate.
            </label>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{humanQ}</label>
              <button type="button" onClick={refreshCaptcha}
                className="p-2 rounded-full hover:bg-turquoise/10 transition-all">
                <RotateCw size={18} className="text-turquoise" />
              </button>
            </div>
            <input type="text" value={humanA} onChange={(e) => setHumanA(e.target.value)}
              className={inputClass} placeholder="Enter your answer" />

            <button type="submit" disabled={loading}
              className="w-full bg-turquoise py-3 rounded-lg font-medium hover:bg-turquoise/90 transition-all mt-4"
              style={{ color: "#0b2149" }}>
              {loading ? "Submitting..." : "Submit Delete Request"}
            </button>

            {msg && (
              <p className="text-center text-sm mt-3 text-[var(--text)]">
                {msg}
                {ticket && <span className="block font-semibold text-turquoise mt-1">Ticket: {ticket}</span>}
              </p>
            )}
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
