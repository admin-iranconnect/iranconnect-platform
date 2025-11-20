import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";

export default function ContactRequestDetailsModal({ request, onClose, refresh }) {
  const [details, setDetails] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (request?.id) fetchDetails();
  }, [request]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/contact-requests/${request.id}`);
      setDetails(res.data);
    } catch (err) {
      console.error("❌ Error fetching details:", err);
      setErrorMsg("Failed to load request details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (!note.trim()) {
      alert("⚠️ Admin note is required before sending a reply.");
      return;
    }
    setSending(true);
    try {
      await apiClient.post(`/api/admin/contact-requests/${request.id}/reply`, {
        admin_note: note,
      });
      alert("✅ Reply sent successfully!");
      setNote("");
      fetchDetails();
      refresh();
    } catch (err) {
      console.error("❌ Error sending reply:", err);
      alert(err.response?.data?.error || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="admin-card max-w-2xl w-full relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-turquoise text-lg font-bold"
        >
          ✖
        </button>

        <h2 className="text-xl font-semibold mb-4 text-center text-turquoise">
          Contact Request Details
        </h2>

        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : errorMsg ? (
          <p className="text-center text-red-500">{errorMsg}</p>
        ) : !details ? (
          <p className="text-center text-gray-400">Request not found.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <span className="font-medium text-turquoise">Name:</span>
                <p>{details.name}</p>
              </div>
              <div>
                <span className="font-medium text-turquoise">Email:</span>
                <p>{details.email}</p>
              </div>
              <div>
                <span className="font-medium text-turquoise">Subject:</span>
                <p>
                  {details.subject_type === "other"
                    ? details.custom_subject || "—"
                    : details.subject_type.replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <span className="font-medium text-turquoise">Status:</span>
                <p>
                  {details.status === "handled" ? "✅ Handled" : "🕓 Pending"}
                </p>
              </div>
              <div>
                <span className="font-medium text-turquoise">Date:</span>
                <p>{new Date(details.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-turquoise">IP Address:</span>
                <p>{details.ip_address || "—"}</p>
              </div>
              <div>
                <span className="font-medium text-turquoise">reCAPTCHA:</span>
                <p>{details.recaptcha_verified ? "✅ Yes" : "❌ No"}</p>
              </div>
            </div>

            <div>
              <span className="font-medium text-turquoise">Message:</span>
              <p className="opacity-90 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-3 mt-1 whitespace-pre-wrap">
                {details.message}
              </p>
            </div>

            {/* 🔽 در صورت handled شدن، اطلاعات ادمین نمایش داده شود */}
            {details.status === "handled" ? (
              <div className="border-t border-[var(--border)] pt-3 space-y-2">
                <p>
                  <strong className="text-turquoise">Admin Note:</strong>{" "}
                  {details.admin_note}
                </p>
                <p>
                  <strong className="text-turquoise">Handled By:</strong>{" "}
                  {details.admin_email || "—"}
                </p>
                <p>
                  <strong className="text-turquoise">Handled At:</strong>{" "}
                  {details.handled_at
                    ? new Date(details.handled_at).toLocaleString()
                    : "—"}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <textarea
                  rows="4"
                  placeholder="Write admin note (required before reply)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="admin-input"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={sending}
                    className="admin-btn admin-btn-primary"
                  >
                    {sending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
