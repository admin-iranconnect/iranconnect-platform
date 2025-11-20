import { useState, useEffect } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ReCAPTCHA from "react-google-recaptcha"; // 🧩 اضافه شد
import { Eye, EyeOff, RotateCw } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("en");
  const [checked, setChecked] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null); // 🧩 اضافه شد

  /* 🎨 Theme & Language Watch */
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
    const savedLang =
      localStorage.getItem("iran_lang") ||
      document.documentElement.getAttribute("lang") ||
      "en";
    setLang(savedLang);
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.getAttribute("data-theme");
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  /* 🧩 بررسی وضعیت ایمیل در لحظه */
  async function checkEmailLive(value) {
    if (!value || !value.includes("@")) {
      setEmailStatus(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
      const res = await axios.post(`${base}/api/auth/check-email`, { email: value });
      if (!res.data.exists) setEmailStatus({ state: "available" });
      else if (res.data.exists && res.data.verified) setEmailStatus({ state: "verified" });
      else if (res.data.exists && !res.data.verified) setEmailStatus({ state: "unverified" });
    } catch (err) {
      console.error("checkEmailLive error:", err);
      setEmailStatus(null);
    }
    setCheckingEmail(false);
  }

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    checkEmailLive(val);
  };

  /* 🟢 Submit — ثبت نام */
  async function submit(e) {
    e.preventDefault();

    if (!checked) {
      setMsgType("error");
      setMsg("⚠️ Please accept the policies before signing up.");
      return;
    }

    if (password !== confirmPassword) {
      setMsgType("error");
      setMsg("Passwords do not match.");
      return;
    }

    if (emailStatus?.state === "verified") {
      setMsgType("error");
      setMsg("This email is already registered. Please log in instead.");
      return;
    }

    if (!captchaToken) {
      setMsgType("error");
      setMsg("Please complete the reCAPTCHA verification.");
      return;
    }

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
      const res = await axios.post(`${base}/api/auth/register`, {
        email,
        password,
        agreed_terms: checked,
        recaptchaToken: captchaToken, // 🧩 ارسال توکن به سرور
      });

      if (res.data?.redirect) {
        window.location.href = res.data.redirect;
        return;
      }

      setMsgType("success");
      setMsg(res.data.message || "✅ Verification email sent successfully.");
    } catch (err) {
      console.error(err);
      setMsgType("error");
      setMsg(err.response?.data?.error || "Server error");
    } finally {
      setLoading(false);
      setCaptchaToken(null);
    }
  }

  /* 🎨 رابط کاربری */
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
            borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            boxShadow:
              theme === "dark"
                ? "10px 10px 25px rgba(0,0,0,0.4), -10px -10px 25px rgba(255,255,255,0.05)"
                : "6px 6px 15px rgba(0,0,0,0.1), -6px -6px 15px rgba(255,255,255,0.4)",
          }}
        >
          <h2 className="text-2xl font-semibold text-center mb-6">
            Create Your Account ✨
          </h2>

          <form onSubmit={submit} className="space-y-4">
            {/* 📧 فیلد ایمیل */}
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={handleEmailChange}
              className="w-full p-3 rounded-lg border border-gray-300 bg-[#f5f7fa]
                         text-gray-900 shadow-inner focus:outline-none focus:ring-2
                         focus:ring-turquoise"
            />

            {/* 🔒 فیلد رمز عبور */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 bg-[#f5f7fa]
                           text-gray-900 shadow-inner focus:outline-none focus:ring-2
                           focus:ring-turquoise"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-sm text-turquoise"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* 🔁 فیلد تکرار رمز عبور */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 bg-[#f5f7fa]
                           text-gray-900 shadow-inner focus:outline-none focus:ring-2
                           focus:ring-turquoise"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-sm text-turquoise"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* 🧾 پذیرش سیاست‌ها */}
            <div className="text-sm mt-4 leading-6">
              <p>You can read IranConnect policies here:</p>
              <p>
                <a href="/privacy-policy" target="_blank" className="text-turquoise underline mx-1">
                  Privacy Policy
                </a>{" "}
                •{" "}
                <a href="/terms-of-service" target="_blank" className="text-turquoise underline mx-1">
                  Terms of Service
                </a>{" "}
                •{" "}
                <a href="/cookies" target="_blank" className="text-turquoise underline mx-1">
                  Cookies
                </a>
              </p>
              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mr-2"
                />
                <span>I have read and accept all the above policies.</span>
              </label>
            </div>

            {/* 🧩 Google reCAPTCHA */}
            <div className="flex justify-center my-3">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>
            
            {/* 🔘 دکمه ثبت‌نام */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-turquoise text-navy py-2 rounded-lg font-medium shadow-md
                         hover:bg-turquoise/90 transition-all duration-200 mt-4"
            >
              {loading ? "Registering..." : "Sign Up"}
            </button>
          </form>

          {/* پیام‌ها */}
          {msg && (
            <p
              className={`text-sm text-center mt-4 font-medium ${
                msgType === "error"
                  ? "text-red-600"
                  : msgType === "success"
                  ? "text-green-600"
                  : "text-gray-700"
              }`}
            >
              {msg}
            </p>
          )}

          {/* لینک ورود */}
          <div className="mt-6 text-center text-sm">
            <p>
              Already have an account?{" "}
              <a href="/auth/login" className="text-turquoise font-medium hover:underline">
                Login
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
