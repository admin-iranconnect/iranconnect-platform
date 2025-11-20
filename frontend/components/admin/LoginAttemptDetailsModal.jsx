/*frontend/components/admin/LoginAttemptDetailsModal.jsx*/
import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";

export default function LoginAttemptDetailsModal({ attempt, onClose }) {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (attempt?.id) fetchDetails();
  }, [attempt]);

  async function fetchDetails() {
    try {
      const res = await apiClient.get(`/api/admin/login-attempts/details/${attempt.id}`);
      setDetails(res.data);
    } catch {
      setDetails(attempt);
    }
  }

  if (!attempt) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="admin-card max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-turquoise text-lg font-bold"
        >
          ✖
        </button>
        <h2 className="text-xl font-semibold mb-3 text-center text-turquoise">
          Login Attempt Details
        </h2>

        {details ? (
          <div className="space-y-2 text-sm">
            <div><strong>Email:</strong> {details.email}</div>
            <div><strong>IP Address:</strong> {details.ip_address || "—"}</div>
            <div><strong>Success:</strong> {details.success ? "✅ Yes" : "❌ No"}</div>
            <div><strong>User Agent:</strong> {details.user_agent}</div>
            <div><strong>Created At:</strong> {new Date(details.created_at).toLocaleString()}</div>
            {details.location && (
              <div><strong>Location:</strong> {details.location}</div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-400">Loading...</p>
        )}
      </div>
    </div>
  );
}
