export default function CookieSettingsModal({ lang, onClose }) {
  const texts = {
    en: {
      title: "Cookie Preferences",
      essential: "Essential cookies (always active)",
      analytics: "Analytics cookies (optional)",
      desc: "You can enable or disable analytics cookies at any time.",
      save: "Save Preferences",
    },
    fr: {
      title: "Préférences des Cookies",
      essential: "Cookies essentiels (toujours actifs)",
      analytics: "Cookies analytiques (optionnels)",
      desc: "Vous pouvez activer ou désactiver les cookies analytiques à tout moment.",
      save: "Enregistrer",
    },
    fa: {
      title: "تنظیمات کوکی‌ها",
      essential: "کوکی‌های ضروری (همیشه فعال)",
      analytics: "کوکی‌های تحلیلی (اختیاری)",
      desc: "می‌توانید کوکی‌های تحلیلی را در هر زمان فعال یا غیرفعال کنید.",
      save: "ذخیره تنظیمات",
    },
  };

  const t = texts[lang];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div
        className="bg-white text-[#0a1a44] rounded-2xl p-6 w-[90%] md:w-[500px] shadow-xl"
        style={{
          textAlign: lang === "fa" ? "right" : "left",
          fontFamily: lang === "fa" ? "Vazirmatn, sans-serif" : "inherit",
        }}
      >
        <h2 className="text-xl font-semibold mb-4">{t.title}</h2>

        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <input type="checkbox" checked readOnly />
            <span>{t.essential}</span>
          </li>
          <li className="flex items-center gap-2">
            <input type="checkbox" />
            <span>{t.analytics}</span>
          </li>
        </ul>

        <p className="mt-4 text-xs">{t.desc}</p>

        <div className="flex justify-end mt-6 gap-3">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
