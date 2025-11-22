import { useEffect, useState } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";
import apiClient from "../../utils/apiClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaExpected, setCaptchaExpected] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [strength, setStrength] = useState({ label: "", color: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");

  // 👁 نمایش رمز در هر فیلد جداگانه
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 🧮 Captcha Generator
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const ops = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let res;
    switch (op) {
      case "+": res = num1 + num2; break;
      case "-": res = num1 - num2; break;
      case "*": res = num1 * num2; break;
    }
    setCaptchaQuestion(`What is ${num1} ${op} ${num2}?`);
    setCaptchaExpected(res.toString());
    setCaptchaAnswer("");
  };

  useEffect(() => generateCaptcha(), []);

  // 🌓 Theme Observer
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // 💪 Password Strength Meter (ساده‌تر شده)
  const evaluateStrength = (pwd) => {
    if (!pwd) return setStrength({ label: "", color: "" });
    const easy = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/; // فقط عدد + حرف
    const medium = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;
    const strong = /^(?=.*[A-Za-z])(?=.*\d).{12,}$/;

    if (strong.test(pwd)) setStrength({ label: "Strong", color: "green" });
    else if (medium.test(pwd)) setStrength({ label: "Medium", color: "orange" });
    else if (easy.test(pwd)) setStrength({ label: "Weak", color: "red" });
    else setStrength({ label: "Too short", color: "gray" });
  };

  // 🔐 Submit Handler
  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg("⚠️ Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("⚠️ New passwords do not match.");
      return;
    }

    // 🔍 بررسی اولیه سمت فرانت
    const pattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!pattern.test(newPassword)) {
      setMsg("⚠️ Password must be at least 8 characters and include both letters and numbers.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/change-password", {
        currentPassword,
        newPassword,
        captchaAnswer,
        captchaExpected,
      });

      if (res.data.success) {
        setMsg("✅ " + res.data.message);
        setTimeout(() => {
          localStorage.removeItem("iran_token");
          localStorage.removeItem("iran_role");
          sessionStorage.clear();
          window.location.href = "/auth/login";
        }, 2500);
      } else {
        setMsg(res.data.error || "Error changing password.");
      }
    } catch (err) {
      console.error("Change Password Error:", err.response?.data || err);
      setMsg(err.response?.data?.error || "Error changing password.");
    }
    setLoading(false);
    generateCaptcha();
  }

  const inputTextColor = "#0A1D37";

  return (
    <div className="min-h-screen flex flex-col text-[var(--text)] transition-all">
      <Header />

      <main
        className="flex-1 flex items-center justify-center p-6"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div
          className="rounded-2xl p-8 w-full max-w-md border transition-all duration-300"
          style={{
            background: theme === "dark" ? "#0b2149" : "#ffffff",
            color: theme === "dark" ? "#ffffff" : "#0a1b2a",
            borderColor:
              theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            boxShadow:
              theme === "dark"
                ? "10px 10px 25px rgba(0,0,0,0.4), -10px -10px 25px rgba(255,255,255,0.05)"
                : "6px 6px 15px rgba(0,0,0,0.1), -6px -6px 15px rgba(255,255,255,0.4)",
          }}
        >
          <h2 className="text-2xl font-semibold text-center mb-6">
            Change Password 🔐
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="Current password"
                className="w-full p-3 rounded-lg border bg-[#f5f7fa] shadow-inner focus:ring-2 focus:ring-turquoise"
                style={{ color: inputTextColor }}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3 text-turquoise"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* New Password */}
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                placeholder="New password"
                className="w-full p-3 rounded-lg border bg-[#f5f7fa] shadow-inner focus:ring-2 focus:ring-turquoise"
                style={{ color: inputTextColor }}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  evaluateStrength(e.target.value);
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-turquoise"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {strength.label && (
              <p className="text-sm" style={{ color: strength.color }}>
                Password strength: {strength.label}
              </p>
            )}

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                className="w-full p-3 rounded-lg border bg-[#f5f7fa] shadow-inner focus:ring-2 focus:ring-turquoise"
                style={{ color: inputTextColor }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-turquoise"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Captcha */}
            <div className="flex items-center justify-between text-sm">
              <span>{captchaQuestion}</span>
              <button
                type="button"
                onClick={generateCaptcha}
                title="New question"
                className="p-2 rounded-full hover:bg-turquoise/10"
              >
                <RotateCw size={16} className="text-turquoise" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Answer"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              required
              style={{ color: inputTextColor }}
              className="w-full p-3 rounded-lg border bg-[#f5f7fa] shadow-inner focus:ring-2 focus:ring-turquoise"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-turquoise text-navy py-2 rounded-lg font-medium shadow-md hover:bg-turquoise/90 transition-all duration-200"
            >
              {loading ? "Processing..." : "Change Password"}
            </button>
          </form>

          {msg && (
            <p
              className="text-sm text-center mt-4"
              style={{
                color: msg.startsWith("✅") ? "#16a34a" : "#dc2626",
              }}
            >
              {msg}
            </p>
          )}

          <p className="text-xs text-white-500 text-center mt-3">
            Password must be at least 8 characters and include both letters and numbers.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
