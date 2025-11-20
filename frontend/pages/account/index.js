//frontend/pages/account/index.js
import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    // واکشی اطلاعات کاربر
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("iran_token");
        window.location.href = "/auth/login";
      });
  }, []);

  async function updatePassword(e) {
    e.preventDefault();
    setMsg("");
    const token = localStorage.getItem("iran_token");
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/auth/change-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(res.data.message || "Password updated successfully.");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.error || "Error updating password.");
    }
  }

  function logout() {
    localStorage.removeItem("iran_token");
    localStorage.removeItem("iran_role");
    window.location.href = "/";
  }

  if (!user)
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 flex justify-center items-center">
          <p className="text-gray-500 text-sm">Loading account info...</p>
        </main>
      </div>
    );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col justify-center items-center p-4">
        <div className="bg-white shadow-[5px_5px_15px_#d1d9e6,-5px_-5px_15px_#ffffff] rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-semibold text-navy text-center mb-6">
            My Account 👤
          </h2>

          <div className="space-y-3 mb-6 text-sm text-gray-700">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            <p>
              <strong>Verified:</strong>{" "}
              {user.is_verified ? (
                <span className="text-green-600 font-medium">Yes ✅</span>
              ) : (
                <span className="text-red-500 font-medium">No ❌</span>
              )}
            </p>
          </div>

          <form onSubmit={updatePassword} className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-turquoise"
            />
            <button
              type="submit"
              className="w-full bg-turquoise text-white py-2 rounded-lg font-medium shadow-md hover:bg-turquoise/90 transition-all duration-200"
            >
              Change Password
            </button>
          </form>

          {msg && <p className="text-sm text-center text-gray-700 mt-3">{msg}</p>}

          <button
            onClick={logout}
            className="w-full mt-6 border border-gray-300 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-100 transition-all"
          >
            Log Out
          </button>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-3">
        © {new Date().getFullYear()} IranConnect. All rights reserved.
      </footer>
    </div>
  );
}
