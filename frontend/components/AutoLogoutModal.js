//frontend/components/AutoLogoutModal.js
'use client';
import { useEffect, useState, useRef } from 'react';

export default function AutoLogoutModal({ visible, onStay, onLogout, warningTime = 30000 }) {
  const [secondsLeft, setSecondsLeft] = useState(warningTime / 1000);
  const countdownRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(warningTime / 1000);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current);
          onLogout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div
        className="bg-white dark:bg-[#0a1d37] p-6 rounded-2xl shadow-2xl max-w-sm w-[90%] text-center border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-3 text-[#0A1D37] dark:text-white">
          Are you still there?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
          Your session will expire in{' '}
          <strong className="text-[#00bfa6]">{secondsLeft}</strong> seconds.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              clearInterval(countdownRef.current);
              onStay();
            }}
            className="px-4 py-2 rounded-lg bg-[#00bfa6] text-white font-medium shadow-md hover:opacity-90 transition"
          >
            I’m here
          </button>
          <button
            onClick={() => {
              clearInterval(countdownRef.current);
              onLogout();
            }}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium shadow-md hover:opacity-90 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
