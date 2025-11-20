import { useState } from "react";
import LanguageToggle from "./LanguageToggle";
import Header from "./Header";
import Footer from "./Footer";

export default function LegalLayout({ texts }) {
  const [lang, setLang] = useState("en");

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0a1a44]">
      <Header />
      <main
        className="flex-grow container mx-auto px-6 pt-10 pb-32"  // ← افزایش فاصله پایین
        style={{
          direction: lang === "fa" ? "rtl" : "ltr",
          textAlign: lang === "fa" ? "right" : "left",
        }}
      >
        <LanguageToggle onChange={setLang} />
        <div
          className="prose max-w-none leading-relaxed mb-10" // ← فاصله اضافه قبل از Footer
          dangerouslySetInnerHTML={{ __html: texts[lang] }}
        />
      </main>
      <Footer />
    </div>
  );
}
