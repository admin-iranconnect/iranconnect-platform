'use client';
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import apiClient from '../utils/apiClient';
import ReCAPTCHA from 'react-google-recaptcha';

export default function ContactPage() {
  // 🧱 حالت اولیه فرم
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subjectType: '',
    customSubject: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  // برای reset کردن reCAPTCHA
  const recaptchaRef = useRef();

  // 🎨 کنترل تم (dark/light)
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current);
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // 🔍 اعتبارسنجی ایمیل
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // 🎯 تغییرات فرم
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));

    if (e.target.name === 'email' && e.target.value) {
      setErrors((prev) => ({
        ...prev,
        email: validateEmail(e.target.value) ? '' : 'Invalid email format',
      }));
    }
  };

  // ✉️ ارسال فرم
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setErrors({});
    setLoading(true);

    const { name, email, subjectType, customSubject, message } = formData;
    const newErrors = {};

    if (!name.trim()) newErrors.name = 'Required';
    if (!email.trim() || !validateEmail(email)) newErrors.email = 'Invalid email';
    if (!subjectType) newErrors.subjectType = 'Please select a subject';
    if (subjectType === 'other' && !customSubject.trim()) newErrors.customSubject = 'Please enter subject';
    if (!message.trim()) newErrors.message = 'Required';
    if (!captchaToken) newErrors.captcha = 'Please verify reCAPTCHA';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.post('/api/contact', {
        name,
        email,
        subjectType,
        customSubject,
        message,
        recaptchaToken: captchaToken,
      });

      if (res.data?.success) {
        setSuccess(res.data.message || '✅ Your message was sent successfully!');
      } else {
        setErrors({ global: res.data?.error || '⚠️ Something went wrong.' });
      }

      // پاک کردن فرم و ریست کپچا
      setFormData({
        name: '',
        email: '',
        subjectType: '',
        customSubject: '',
        message: '',
      });
      setCaptchaToken(null);
      if (recaptchaRef.current) recaptchaRef.current.reset();
    } catch (err) {
      console.error('❌ Contact submit error:', err);
      const msg = err.response?.data?.error || 'Server error. Please try again later.';
      setErrors({ global: msg });
    } finally {
      setLoading(false);
    }
  };
  /* ───────────── 🧩 رابط کاربری ───────────── */
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
          <h2 className="text-2xl font-semibold text-center mb-6">📩 Contact Us</h2>

          {/* پیام‌های وضعیت */}
          {errors.global && <p className="text-red-500 text-sm mb-3">{errors.global}</p>}
          {success && <p className="text-green-500 text-sm mb-3">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              className="input-default w-full"
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}

            <input
              type="email"
              name="email"
              placeholder="Your email"
              value={formData.email}
              onChange={handleChange}
              className={`input-default w-full ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

            {/* 🔽 Subject Dropdown */}
            <select
              name="subjectType"
              value={formData.subjectType}
              onChange={handleChange}
              className="input-default w-full"
            >
              <option value="">-- Select a subject --</option>
              <option value="unblock_request">Request Unblock</option>
              <option value="business_introduction">Business Introduction</option>
              <option value="personal_business_registration">Personal Business Registration</option>
              <option value="other">Other</option>
            </select>
            {errors.subjectType && <p className="text-red-500 text-xs">{errors.subjectType}</p>}

            {/* 📝 Custom Subject Field */}
            {formData.subjectType === 'other' && (
              <>
                <input
                  type="text"
                  name="customSubject"
                  placeholder="Enter subject"
                  value={formData.customSubject}
                  onChange={handleChange}
                  className="input-default w-full"
                />
                {errors.customSubject && <p className="text-red-500 text-xs">{errors.customSubject}</p>}
              </>
            )}

            <textarea
              name="message"
              placeholder="Your message"
              rows="4"
              value={formData.message}
              onChange={handleChange}
              className="input-default w-full"
            />
            {errors.message && <p className="text-red-500 text-xs">{errors.message}</p>}

            {/* 🔐 Google reCAPTCHA */}
            <div className="flex justify-center my-3">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>
            {errors.captcha && <p className="text-red-500 text-xs text-center">{errors.captcha}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
