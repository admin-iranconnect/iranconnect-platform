import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ReCAPTCHA from "react-google-recaptcha";
import { Eye, EyeOff, RotateCw } from "lucide-react";

export default function ChangePassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const [captchaToken, setCaptchaToken] = useState(null);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setMsg("Invalid or missing token.");
        setMsgType("error");
        return;
      }

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
        const res = await axios.get(`${base}/api/auth/validate-reset/${token}`);

        if (res.data.valid) {
          // ✅ توکن معتبر → فرم باید نمایش داده بشه
          setMsg("");
          setMsgType("success");
        } else {
          // ❌ توکن نامعتبر
          setMsg(res.data.error || "Invalid or expired link.");
          setMsgType("error");
        }
      } catch (err) {
        setMsg(err.response?.data?.error || "Invalid or expired link.");
        setMsgType("error");
      }
    }

  validateToken();
}, [token]);

  // 🌓 تم دینامیک هماهنگ با Header
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setMsg("Please fill out both fields.");
      setMsgType("error");
      return;
    }
    if (password !== confirmPassword) {
      setMsg("Passwords do not match.");
      setMsgType("error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/auth/reset`,
        { token, password, confirmPassword }
      );

      if (res.data.success) {
        setMsg(res.data.message || "Password reset successful!");
        setMsgType("success");
        setTimeout(() => {
          router.push(res.data.redirect || "/auth/login");
        }, 2500);
      } else {
        setMsg(res.data.error || "Error resetting password.");
        setMsgType("error");
      }
    } catch (err) {
      console.error(err);
      setMsg(
        err.response?.data?.error ||
          "Link expired or invalid. Please try again."
      );
      setMsgType("error");
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#ffffff",
        color: "var(--text)",
      }}
    >
      <Header />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <div
          className="rounded-2xl p-8 w-full max-w-md border transition-all duration-300"
          style={{
            background: theme === "dark" ? "#0b2149" : "#ffffff",
            color: theme === "dark" ? "#ffffff" : "#0a1b2a",
            borderColor:
              theme === "dark"
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            boxShadow:
              theme === "dark"
                ? "10px 10px 25px rgba(0,0,0,0.4), -10px -10px 25px rgba(255,255,255,0.05)"
                : "6px 6px 15px rgba(0,0,0,0.1), -6px -6px 15px rgba(255,255,255,0.4)",
          }}
        >
          <h2 className="text-2xl font-semibold text-center mb-6">
            Set a New Password
          </h2>

          {/* ✅ Conditional rendering */}
          {msgType === "error" ? (
            // 🚫 حالت منقضی یا استفاده‌شده
            <div className="text-center mt-6">
              <p className="text-white-600 font-medium text-sm text-lg mb-6">
                {msg || "This password reset link has expired or been used."}
              </p>
              <button
                onClick={() => (window.location.href = "/auth/forgot")}
                className="bg-turquoise text-navy px-5 py-2 rounded-lg font-medium shadow-md hover:bg-turquoise/90 transition-all duration-200"
              >
                Request a new reset link
              </button>
            </div>
          ) : (
            // ✅ فرم فقط زمانی نمایش داده می‌شود که لینک معتبر باشد
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  className="w-full p-3 rounded-lg border border-gray-300 bg-[#f5f7fa] text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-turquoise"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-sm text-turquoise hover:underline"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  className="w-full p-3 rounded-lg border border-gray-300 bg-[#f5f7fa] text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-turquoise"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-sm text-turquoise hover:underline"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 🔒 Google reCAPTCHA */}
              <div className="flex justify-center my-3">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  onChange={(token) => setCaptchaToken(token)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-turquoise text-navy py-2 rounded-lg font-medium shadow-md hover:bg-turquoise/90 transition-all duration-200"
              >
                {loading ? "Processing..." : "Change Password"}
              </button>
            </form>
          )}

          </div>
      </main>

      <Footer />
    </div>
  );
}
