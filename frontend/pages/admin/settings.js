import { useState, useEffect } from "react";
import apiClient from "../../utils/apiClient";
import AdminLayout from "../../components/admin/AdminLayout";

export default function SettingsPage() {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("user");

  // ✅ بررسی نقش و توکن در mount
  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    const userRole = localStorage.getItem("iran_role");

    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    if (userRole !== "admin" && userRole !== "superadmin") {
      window.location.href = "/";
      return;
    }

    setRole(userRole);
  }, []);

  // 🔐 تغییر رمز عبور
  async function handlePasswordChange(e) {
    e.preventDefault();
    setMsg("");
    setError("");

    const { current, new: newPass, confirm } = passwords;

    if (!current || !newPass || !confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPass !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|:;"'<>,.?/~`]).{8,}$/;
    if (!strongRegex.test(newPass)) {
      setError(
        "Password must include uppercase, lowercase, number, and special character (min 8 chars)."
      );
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(`/api/admin/change-password`, {
        currentPassword: current,
        newPassword: newPass,
      });

      setMsg("✅ Password updated successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      console.error("❌ Password change error:", err);
      setError(err.response?.data?.error || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-container">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-6">⚙️ Settings</h2>

        {/* === تغییر رمز عبور === */}
        <section
          className="mb-8 p-5 rounded-2xl border border-[var(--border)] 
          bg-[var(--card-bg)] text-[var(--text)] 
          shadow-[5px_5px_15px_var(--shadow-dark),
          -5px_-5px_15px_var(--shadow-light)] transition"
        >
          <h3 className="text-base font-medium mb-3">🔐 Change Password</h3>

          <form onSubmit={handlePasswordChange} className="space-y-3">
            {["current", "new", "confirm"].map((field, i) => (
              <div key={i} className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    field === "current"
                      ? "Current password"
                      : field === "new"
                      ? "New password"
                      : "Confirm new password"
                  }
                  value={passwords[field]}
                  onChange={(e) =>
                    setPasswords({ ...passwords, [field]: e.target.value })
                  }
                  className="w-full p-3 border border-[var(--border)] rounded bg-[var(--bg)] 
                  text-[var(--text)] pr-10 focus:outline-none focus:ring-2 focus:ring-turquoise transition"
                />
                {field === "current" && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-turquoise"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                )}
              </div>
            ))}

            <p className="text-xs text-gray-500 mt-1">
              Password must contain uppercase, lowercase, numbers, and symbols — minimum 8 characters.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 px-4 py-2 bg-turquoise text-navy font-medium rounded shadow 
              hover:bg-turquoise/90 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            {msg && (
              <p className="text-sm mt-3 p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {msg}
              </p>
            )}
            {error && (
              <p className="text-sm mt-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </p>
            )}
          </form>
        </section>

        {/* === اطلاعات سیستم === */}
        <section
          className="p-5 rounded-2xl border border-[var(--border)] 
          bg-[var(--card-bg)] text-[var(--text)] 
          shadow-[5px_5px_15px_var(--shadow-dark),
          -5px_-5px_15px_var(--shadow-light)] transition"
        >
          <h3 className="text-base font-medium mb-3">🖥️ System Info</h3>
          <ul className="text-sm opacity-80 space-y-2">
            <li>
              Logged in as: <b>{role}</b>
            </li>
            <li>
              Frontend Version: <b>v1.0</b>
            </li>
            <li>
              Backend API: <b>Connected</b>
            </li>
          </ul>
        </section>
      </div>
    </AdminLayout>
  );
}
