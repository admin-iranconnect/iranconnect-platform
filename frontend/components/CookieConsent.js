import { useEffect, useState } from "react";
import axios from "axios";
import CookieSettingsModal from "./CookieSettingsModal";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lang, setLang] = useState("en");
  const [texts, setTexts] = useState(null);

  // 🎯 بارگذاری ترجمه‌ها از دیتابیس
  useEffect(() => {
    const stored =
      localStorage.getItem("iran_lang") ||
      document.documentElement.getAttribute("lang") ||
      "en";
    setLang(stored);
  }, []);

  useEffect(() => {
    if (!lang) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/policies/cookie_banner?lang=${lang}`)
      .then((res) => {
        try {
          const data = JSON.parse(res.data.content);
          setTexts(data);
        } catch {
          setTexts(null);
        }
      })
      .catch(() => setTexts(null));
  }, [lang]);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setVisible(true);
  }, []);

  const handleChoice = (choice) => {
    localStorage.setItem("cookieConsent", choice);
    setVisible(false);

    if (choice === "accepted") {
      const script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX";
      script.async = true;
      document.body.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag("js", new Date());
      gtag("config", "G-XXXXXXX");
    }
  };

  if (!visible || !texts) return null;

  const t = texts;

  return (
    <>
      {showSettings && (
        <CookieSettingsModal lang={lang} onClose={() => setShowSettings(false)} />
      )}

      <div
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[600px]
                   bg-white border border-gray-200 shadow-lg rounded-2xl p-5 z-50 text-[#0a1a44]"
        style={{ direction: lang === "fa" ? "rtl" : "ltr" }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{t.title}</h2>
            <p className="text-sm mt-1">{t.desc}</p>
          </div>

          <div className="flex gap-2 flex-row">
            <button
              onClick={() => handleChoice("accepted")}
              className="bg-[#00bfa6] hover:bg-[#00a48f] text-white px-4 py-2 rounded-md text-sm"
            >
              {t.accept}
            </button>
            <button
              onClick={() => handleChoice("rejected")}
              className="bg-gray-200 hover:bg-gray-300 text-[#0a1a44] px-4 py-2 rounded-md text-sm"
            >
              {t.reject}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="underline text-sm text-[#0a1a44]"
            >
              {t.manage}
            </button>
          </div>
        </div>

        <div className="flex justify-center mt-3 gap-2" style={{ direction: "ltr" }}>
          {["en", "fr", "fa"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`text-xs px-2 py-1 rounded-md transition-all ${
                lang === l ? "bg-[#0a1a44] text-white" : "bg-gray-100 text-[#0a1a44]"
              }`}
            >
              {l === "en" ? "English" : l === "fr" ? "Français" : "فارسی"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
