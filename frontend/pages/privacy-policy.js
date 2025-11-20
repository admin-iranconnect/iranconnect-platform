// /frontend/pages/privacy-policy.js
import { useEffect, useState } from "react";
import LegalLayout from "../components/LegalLayout";
import axios from "axios";

export default function PrivacyPolicy() {
  const [texts, setTexts] = useState({ en: "", fr: "", fa: "" });

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

    async function load(lang) {
      try {
        const res = await axios.get(`${API}/api/policies/privacy?lang=${lang}`);
        setTexts(prev => ({ ...prev, [lang]: res.data.content }));
      } catch (err) {
        console.warn(`No ${lang} version found`);
      }
    }

    load("en");
    load("fr");
    load("fa");
  }, []);

  return <LegalLayout texts={texts} />;
}
