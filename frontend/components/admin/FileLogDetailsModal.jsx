//frontend/components/admin/FileLogDetailsModal.jsx
import { useEffect, useState } from "react";
import apiClient from "../../utils/apiClient";

export default function FileLogDetailsModal({ log, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (log?.id) fetchDetails();
  }, [log]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/files/logs?id=${log.id}`);
      setDetails(res.data[0] || log);
    } catch (err) {
      console.error("❌ Error fetching file log:", err);
      setDetails(log);
    } finally {
      setLoading(false);
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

        <h2 className="text-xl font-semibold mb-3 text-center text-turquoise">
          File Log Details
        </h2>

        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <strong>File Name:</strong> {details.file_name}
            </div>
            <div>
              <strong>Mime Type:</strong> {details.mime_type}
            </div>
            <div>
              <strong>Status:</strong> {details.scan_status}
            </div>
            <div>
              <strong>Upload Source:</strong> {details.upload_source}
            </div>
            <div>
              <strong>User:</strong> {details.user_email || "—"}
            </div>
            <div>
              <strong>Size:</strong>{" "}
              {details.file_size ? (details.file_size / 1024).toFixed(1) + " KB" : "—"}
            </div>
            <div>
              <strong>IP Address:</strong> {details.ip_address || "—"}
            </div>
            <div>
              <strong>Scanned At:</strong>{" "}
              {new Date(details.scanned_at).toLocaleString()}
            </div>
            {details.error_message && (
              <div>
                <strong>Error Message:</strong>{" "}
                <span className="text-red-500">{details.error_message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
