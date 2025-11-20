import { useState, useEffect } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ReCAPTCHA from "react-google-recaptcha";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("en");

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

  // ✉️ ارسال فرم
  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) {
      setMsg("Please enter your email address.");
      setMsgType("error");
      return;
    }

    if (!captchaToken) {
      setMsg("Please verify the reCAPTCHA.");
      setMsgType("error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/auth/forgot`,
        { email, recaptchaToken: captchaToken }
      );
      setMsg(res.data.message || "If the email exists, we sent a reset link.");
      setMsgType("success");
      setCaptchaToken(null);
    } catch (err) {
      console.error(err);
      setMsg("If the email exists, we sent a reset link.");
      setMsgType("info");
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
            Reset your password 🔑
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 bg-[#f5f7fa] text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-turquoise"
            />

            {/* 🔒 Google reCAPTCHA */}
            <div className="flex justify-center my-3">
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-turquoise text-navy py-2 rounded-lg font-medium shadow-md hover:bg-turquoise/90 transition-all duration-200"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          {msg && (
            <p
              className="text-sm text-center mt-4"
              style={{
                color:
                  msgType === "error"
                    ? "red"
                    : msgType === "success"
                    ? "green"
                    : theme === "dark"
                    ? "#e2e8f0"
                    : "#333",
              }}
            >
              {msg}
            </p>
          )}

          {/* لینک ورود */}
          <div className="mt-6 text-center text-sm text-white-600">
            <p>
              {lang === "fa"
                ? "قبلاً حساب کاربری دارید؟"
                : lang === "fr"
                ? "Vous avez déjà un compte ?"
                : "Already have an account?"}{" "}
              <a
                href="/auth/login"
                className="text-turquoise font-medium hover:underline"
              >
                {lang === "fa"
                  ? "ورود"
                  : lang === "fr"
                  ? "Connexion"
                  : "Login"}
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
