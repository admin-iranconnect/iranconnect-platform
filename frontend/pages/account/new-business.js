//frontend/pages/account/new-business.js
'use client';
import { useState, useEffect } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { RotateCw } from "lucide-react";

export default function NewBusinessRequest() {
  const [form, setForm] = useState({
    name: "",
    category: "",
    sub_category: "",
    country: "",
    city: "",
    address: "",
    postal_code: "",
    phone: "",
    email: "",
    website: "",
    map_link: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [ownershipDoc, setOwnershipDoc] = useState(null);
  const [buildingImage, setBuildingImage] = useState(null);
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

  /* 🧠 کپچا */
  useEffect(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setHumanQ(`${a} + ${b} = ?`);
    setCorrectAnswer(a + b);
  }, []);
  const refreshCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setHumanQ(`${a} + ${b} = ?`);
    setCorrectAnswer(a + b);
  };

  /* 🎨 تم */
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

  /* ✅ لایو ولیدیشن */
  const validateField = (name, value) => {
    let error = "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+\d{6,15}$/;
    const urlRegex = /^(https?:\/\/)?([\w\d-]+\.)+[\w]{2,}(\/.*)?$/;

    if (name === "email" && value && !emailRegex.test(value))
      error = "Invalid email format (e.g. example@mail.com)";
    if (name === "phone" && value && !phoneRegex.test(value))
      error = "Phone must be like +33712345678 (no 0)";
    if (name === "website" && value && !urlRegex.test(value))
      error = "Website must start with https://";
    if (name === "map_link" && value && !value.startsWith("https://maps"))
      error = "Map link must start with https://maps...";
    if (name === "name" && value.trim().length < 3)
      error = "Business name must be at least 3 characters long";

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    validateField(name, value);
  };

  /* 📤 ارسال فرم */
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(""); setTicket("");

    const hasErrors = Object.values(errors).some((e) => e);
    if (hasErrors) return setMsg("⚠️ Please fix validation errors before submitting.");
    if (!confirm) return setMsg("Please confirm that your information is accurate.");
    if (humanA.trim() !== String(correctAnswer)) return setMsg("Human verification failed.");
    if (!ownershipDoc || !buildingImage) return setMsg("Please upload both required files.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("request_type", "new");
      fd.append("payload", JSON.stringify(form));
      fd.append("files", ownershipDoc);
      fd.append("files", buildingImage);

      const res = await axios.post(`${API_BASE}/api/requests`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setMsg("✅ Your new business request has been submitted successfully!");
      setTicket(res.data.ticket_code);
      setTimeout(() => window.location.reload(), 10000);
      setForm({
        name: "", category: "", sub_category: "", country: "", city: "",
        address: "", postal_code: "", phone: "", email: "", website: "", map_link: "", description: "",
      });
      setErrors({});
      setOwnershipDoc(null);
      setBuildingImage(null);
      setConfirm(false);
      refreshCaptcha();
    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.error || "Error submitting request.");
    }
    setLoading(false);
  }

  /* 🎨 استایل‌ها */
  const cardStyle = {
    background: theme === "dark" ? "#0b2149" : "#ffffff",
    color: theme === "dark" ? "#ffffff" : "#0a1b2a",
    borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    boxShadow:
      theme === "dark"
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
          <h2 className="text-2xl font-semibold text-center mb-6">🆕 Add New Business Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {Object.keys(form).map((f) => (
              <div key={f}>
                <label className="block font-medium mb-1 capitalize">{f === "name" ? "Business Name" : f.replace("_", " ")}</label>
                <input
                  name={f}
                  value={form[f]}
                  onChange={handleChange}
                  className={`${inputClass} ${errors[f] ? "border-red-500" : ""}`}
                  placeholder={
                    f === "name"
                      ? "Enter your business name"
                      : `Enter ${f.replace("_", " ")}`
                  }
                />
                {errors[f] && <p className="text-red-400 text-sm mt-1">{errors[f]}</p>}
              </div>
            ))}

            <div>
              <label className="block font-medium mb-1">Proof of Ownership (required)</label>
              <input type="file" onChange={(e) => setOwnershipDoc(e.target.files[0])}
                accept="image/*,.pdf" className="w-full text-sm" required />
            </div>

            <div>
              <label className="block font-medium mb-1">Building Photo (required)</label>
              <input type="file" onChange={(e) => setBuildingImage(e.target.files[0])}
                accept="image/*" className="w-full text-sm" required />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              I confirm that the information provided above is accurate.
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
              {loading ? "Submitting..." : "Submit New Business Request"}
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
