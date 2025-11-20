'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('iran_token');
      if (token) setIsLoggedIn(true);

      const savedLang =
        localStorage.getItem('iran_lang') ||
        document.documentElement.getAttribute('lang') ||
        'en';
      setLang(savedLang);
    }
  }, []);

  const cookieTexts = {
    en: 'Change cookie settings',
    fr: 'Modifier les cookies',
    fa: 'تغییر تنظیمات کوکی‌ها',
  };

  const resetCookies = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cookieConsent');
      window.location.reload();
    }
  };

  return (
    <footer className="site-footer">
      <div className="container-mobile">
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          {/* 🟢 خلاصه برند */}
          <div style={{ maxWidth: 420 }}>
            <h3 style={{ color: '#fff', marginBottom: 8 }}>IranConnect</h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: '1.6' }}>
              Helping Iranians abroad find trusted professionals and connect with their community.
              <br />
              <Link
                href="/about"
                className="underline text-turquoise hover:text-white transition"
              >
                About IranConnect →
              </Link>
            </p>
          </div>

          {/* 🔗 لینک‌ها */}
          <div>
            <h4 style={{ color: '#fff' }}>
              {lang === 'fa'
                ? 'لینک‌ها'
                : lang === 'fr'
                ? 'Liens rapides'
                : 'Quick Links'}
            </h4>
            <div className="col flex flex-col gap-1">
              <Link href="/">Home</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/about">About</Link>
              {!isLoggedIn && <Link href="/auth/login">Login</Link>}
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                  margin: '6px 0',
                }}
              />
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-of-service">Terms of Service</Link>
              <Link href="/cookies">Cookies Policy</Link>
            </div>
          </div>
        </div>

        {/* 🕓 کپی‌رایت + کوکی */}
        <div
          style={{
            marginTop: 32,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <p>© {new Date().getFullYear()} IranConnect</p>
          <button
            onClick={resetCookies}
            style={{
              marginTop: 6,
              fontSize: 14,
              background: 'transparent',
              color: 'rgba(255,255,255,0.85)',
              border: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => (e.target.style.color = '#00bfa6')}
            onMouseOut={(e) => (e.target.style.color = 'rgba(255,255,255,0.85)')}
          >
            {cookieTexts[lang]}
          </button>
        </div>
      </div>
    </footer>
  );
}
