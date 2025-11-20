//frontend/components/admin/RequestDetailsModal.jsx
import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";

export default function RequestDetailsModal({ request, onClose, refresh }) {
  const [details, setDetails] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    if (request?.id) fetchDetails();
  }, [request]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/requests/${request.id}`);
      setDetails(res.data);
    } catch (err) {
      console.error("❌ Error fetching details:", err);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action) {
    if (!note.trim()) {
      setErrorMsg("⚠️ Admin note is required.");
      return;
    }
    setErrorMsg("");
    try {
      await apiClient.put(`/api/admin/requests/${request.id}/status`, {
        status: action,
        admin_note: note,
      });
      refresh();
      onClose();
    } catch (err) {
      console.error("❌ Action failed:", err);
      alert(err.response?.data?.error || "Action failed.");
    }
  }

  async function handleDownload() {
    try {
      setDownloading(true);
      const res = await apiClient.get(
        `/api/admin/requests/${request.id}/download`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${details?.ticket_code || "request"}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("❌ Download failed.");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  const renderPayload = (payload) => {
    if (!payload || typeof payload !== "object") return <p>—</p>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mt-2">
        {Object.entries(payload).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="font-medium text-turquoise capitalize">
              {key.replace(/_/g, " ")}:
            </span>
            <span className="opacity-80">
              {value === "" || value === null ? "—" : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const isActionable = details?.status === "pending";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="admin-card max-w-3xl w-full relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-turquoise text-lg font-bold"
        >
          ✖
        </button>

        <h2 className="text-xl font-semibold mb-3 text-center text-turquoise">
          Request Details
        </h2>

        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : !details ? (
          <p className="text-center text-gray-400">Request not found.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <strong>Ticket:</strong> {details.ticket_code}
            </div>
            <div>
              <strong>Status:</strong> {details.status}
            </div>
            <div>
              <strong>Created:</strong>{" "}
              {new Date(details.created_at).toLocaleString()}
            </div>

            {details.admin_email && (
              <div>
                <strong>Processed By:</strong> {details.admin_email}
              </div>
            )}

            <div className="mt-4">
              <h3 className="font-semibold mb-1">Form Data:</h3>
              {renderPayload(details.payload)}
            </div>

            {details.attachments && details.attachments.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-1">Attachments:</h3>
                <ul className="list-disc pl-6">
                  {details.attachments.map((f, i) => (
                    <li key={i}>
                      <a
                        href={`${
                          process.env.NEXT_PUBLIC_API_BASE ||
                          "http://localhost:5000"
                        }${f.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-turquoise hover:underline"
                      >
                        {f.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 📎 دکمه دانلود همیشه در دسترس */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="admin-btn admin-btn-primary text-sm px-4 py-2"
              >
                {downloading ? "Downloading..." : "Download Data"}
              </button>
            </div>

            {/* ✳️ بخش تصمیم ادمین */}
            {isActionable ? (
              <>
                {errorMsg && (
                  <p className="text-red-500 text-xs text-center">{errorMsg}</p>
                )}
                {showApproveBox ? (
                  <div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="admin-input min-h-[100px]"
                      placeholder="Enter approval note..."
                    />
                    <div className="flex justify-end gap-3 mt-3">
                      <button
                        className="admin-btn admin-btn-secondary"
                        onClick={() => {
                          setShowApproveBox(false);
                          setNote("");
                          setErrorMsg("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="admin-btn admin-btn-primary"
                        onClick={() => handleAction("approved")}
                      >
                        Confirm Approve
                      </button>
                    </div>
                  </div>
                ) : showRejectBox ? (
                  <div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="admin-input min-h-[100px]"
                      placeholder="Enter rejection reason..."
                    />
                    <div className="flex justify-end gap-3 mt-3">
                      <button
                        className="admin-btn admin-btn-secondary"
                        onClick={() => {
                          setShowRejectBox(false);
                          setNote("");
                          setErrorMsg("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="admin-btn admin-btn-primary bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleAction("rejected")}
                      >
                        Save Decision
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setShowRejectBox(true);
                        setShowApproveBox(false);
                        setNote("");
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() => {
                        setShowApproveBox(true);
                        setShowRejectBox(false);
                        setNote("");
                      }}
                    >
                      Approve
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center mt-6 text-gray-400 text-sm">
                {details.status === "approved" && (
                  <p>✅ This request has been approved.</p>
                )}
                {details.status === "rejected" && (
                  <div>
                    <p>❌ This request was rejected.</p>
                    {details.admin_note && (
                      <p className="italic text-xs text-gray-400 mt-2">
                        Note from admin: {details.admin_note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
