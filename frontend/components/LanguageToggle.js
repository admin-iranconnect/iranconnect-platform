import { useState } from "react";

export default function LanguageToggle({ onChange }) {
  const [lang, setLang] = useState("en");

  const handleChange = (newLang) => {
    setLang(newLang);
    onChange(newLang);
  };

  return (
    <div
      className="flex justify-center gap-3 my-4"
      style={{ direction: "ltr" }} // ⬅️ جهت ثابت LTR برای حفظ ترتیب
    >
      {["en", "fr", "fa"].map((code) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          className={`px-3 py-1 rounded-md transition-all ${
            lang === code
              ? "bg-[#00bfa6] text-white shadow-md"
              : "bg-gray-200 hover:bg-gray-300 text-[#0a1a44]"
          }`}
          style={{
            fontFamily: code === "fa" ? "Vazirmatn, sans-serif" : "inherit",
          }}
        >
          {code === "en" ? "English" : code === "fr" ? "Français" : "فارسی"}
        </button>
      ))}
    </div>
  );
}
