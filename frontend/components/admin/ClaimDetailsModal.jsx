//frontend/components/admin/ClaimDetailsModal.jsx
'use client';
import { useEffect, useState } from 'react';

export default function ClaimDetailsModal({ claim, onClose, onApprove, onReject }) {
  const [adminNote, setAdminNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  // بستن مودال با ESC
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!claim) return null;

  const isActionable =
    claim.status === 'pending' || claim.status === 'pending_review';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  // 📎 دانلود امن فایل مدرک مالکیت با JWT
  async function handleDownload() {
    try {
      setDownloading(true);
      const token = localStorage.getItem('iran_token');
      if (!token) throw new Error('Missing admin token');

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/admin/claims/${claim.id}/document`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Download failed (auth or file missing)');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download =
        claim.document_url?.split('/').pop() || 'ownership_document.png';
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Download error:', err);
      alert('❌ Unable to download document (auth or file missing).');
    } finally {
      setDownloading(false);
    }
  }

  // ✅ هندل تأیید با بررسی نوت
  const handleApprove = () => {
    if (!adminNote.trim()) {
      setErrorMsg('⚠️ Please enter an approval note before confirming.');
      return;
    }
    setErrorMsg('');
    onApprove(adminNote);
  };

  // ❌ هندل رد با بررسی نوت
  const handleReject = () => {
    if (!adminNote.trim()) {
      setErrorMsg('⚠️ Please enter a reason for rejection.');
      return;
    }
    setErrorMsg('');
    onReject(adminNote);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="admin-section relative w-[90%] md:w-[600px] bg-[var(--card-bg)] text-[var(--text)] rounded-xl shadow-lg overflow-y-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ✳️ هدر */}
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[var(--card-bg)] z-10">
          <h2 className="admin-title text-lg font-semibold">Claim Details</h2>
          <button
            onClick={onClose}
            className="text-[var(--text)] text-xl font-bold hover:text-turquoise"
          >
            ×
          </button>
        </div>

        {/* ✳️ محتوای مودال */}
        <div className="space-y-3 text-sm overflow-y-auto pr-1 flex-grow">
          <div><strong>Business:</strong><p>{claim.business_name}</p></div>
          <div><strong>Applicant Name:</strong><p>{claim.full_name || '—'}</p></div>
          <div><strong>Applicant Role:</strong><p>{claim.applicant_role || '—'}</p></div>
          <div><strong>Email:</strong><p>{claim.email}</p></div>
          <div><strong>Submitted by (User):</strong><p>{claim.user_email || '—'}</p></div>
          <div><strong>Phone:</strong><p>{claim.phone || '—'}</p></div>
          <div><strong>Description:</strong><p>{claim.description || '—'}</p></div>
          <div><strong>Verification Code:</strong><p className="font-bold text-turquoise">{claim.claim_token}</p></div>

          {/* 📎 دکمه دانلود مدرک مالکیت */}
          {claim.document_url && (
            <div>
              <strong>Ownership Document:</strong>
              <div className="mt-1">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="admin-btn admin-btn-primary !bg-turquoise mt-1"
                >
                  {downloading ? 'Downloading...' : '📎 Download Document'}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 text-xs admin-muted border-t border-gray-200 mt-4">
            <span>Status: {claim.status}</span>
            <span>Created: {formatDate(claim.created_at)}</span>
          </div>
        </div>

        {/* ✳️ بخش دکمه‌های تصمیم */}
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-200 sticky bottom-0 bg-[var(--card-bg)] py-3">
          {errorMsg && (
            <p className="text-red-500 text-xs text-center -mt-2">{errorMsg}</p>
          )}

          {isActionable ? (
            <>
              {/* 🔹 اگر حالت تایید فعال شده */}
              {showApproveBox ? (
                <div>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="admin-input w-full h-24 resize-none"
                    placeholder="Enter note for approval..."
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setShowApproveBox(false);
                        setAdminNote('');
                        setErrorMsg('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={handleApprove}
                    >
                      Confirm Approve
                    </button>
                  </div>
                </div>
              ) : showRejectBox ? (
                <div>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="admin-input w-full h-24 resize-none"
                    placeholder="Enter reason for rejection..."
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setShowRejectBox(false);
                        setAdminNote('');
                        setErrorMsg('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={handleReject}
                    >
                      Save Decision
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-3">
                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => {
                      setShowRejectBox(true);
                      setShowApproveBox(false);
                      setAdminNote('');
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      setShowApproveBox(true);
                      setShowRejectBox(false);
                      setAdminNote('');
                    }}
                  >
                    Approve
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-center w-full text-gray-500">
              {claim.status === 'verified' && (
                <p>
                  ✅ This claim has been approved on{' '}
                  {formatDate(claim.verified_at)}
                </p>
              )}
              {claim.status === 'rejected' && (
                <div>
                  <p>
                    ❌ This claim was rejected on{' '}
                    {formatDate(claim.processed_at)}
                  </p>
                  {claim.admin_note && (
                    <p className="italic text-xs text-gray-400 mt-2">
                      Note from admin: {claim.admin_note}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
