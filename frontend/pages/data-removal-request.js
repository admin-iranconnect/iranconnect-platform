import { useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LanguageToggle from "../components/LanguageToggle";

export default function DataRemovalRequest() {
  const [lang, setLang] = useState("en");
  const [form, setForm] = useState({
    business_name: "",
    contact_email: "",
    message: "",
    request_type: "delete",
  });
  const [status, setStatus] = useState({ success: false, error: "" });

  const texts = {
    en: {
      title: "Data Removal / Update Request",
      subtitle:
        "If your business is listed on IranConnect.org and you wish to update or remove it, please fill out this form.",
      business: "Business name",
      email: "Contact email",
      type: "Request type",
      delete: "Delete my business data",
      update: "Update incorrect information",
      message: "Details or message",
      submit: "Submit request",
      success: "✅ Your request has been sent successfully.",
      error: "❌ Failed to send your request. Please try again later.",
    },
    fr: {
      title: "Demande de Suppression / Mise à Jour des Données",
      subtitle:
        "Si votre entreprise figure sur IranConnect.org et que vous souhaitez la modifier ou la supprimer, veuillez remplir ce formulaire.",
      business: "Nom de l’entreprise",
      email: "E-mail de contact",
      type: "Type de demande",
      delete: "Supprimer mes données professionnelles",
      update: "Corriger des informations erronées",
      message: "Détails ou message",
      submit: "Envoyer la demande",
      success: "✅ Votre demande a été envoyée avec succès.",
      error:
        "❌ Échec de l’envoi de la demande. Veuillez réessayer plus tard.",
    },
    fa: {
      title: "درخواست حذف یا ویرایش اطلاعات",
      subtitle:
        "اگر اطلاعات کسب‌وکار شما در سایت IranConnect.org نمایش داده می‌شود و مایل به حذف یا اصلاح آن هستید، لطفاً فرم زیر را تکمیل کنید.",
      business: "نام کسب‌وکار",
      email: "ایمیل تماس",
      type: "نوع درخواست",
      delete: "حذف اطلاعات کسب‌وکار",
      update: "اصلاح اطلاعات نادرست",
      message: "توضیحات یا پیام شما",
      submit: "ارسال درخواست",
      success: "✅ درخواست شما با موفقیت ارسال شد.",
      error: "❌ ارسال درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
    },
  };

  const t = texts[lang];

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ success: false, error: "" });
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/privacy/data-removal`,
        form
      );
      setStatus({ success: true, error: "" });
      setForm({ business_name: "", contact_email: "", message: "", request_type: "delete" });
    } catch (err) {
      console.error(err);
      setStatus({ success: false, error: "error" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0a1a44]">
      <Header />
      <main
        className="flex-grow container mx-auto px-6 pt-10 pb-32"
        style={{
          direction: lang === "fa" ? "rtl" : "ltr",
          textAlign: lang === "fa" ? "right" : "left",
        }}
      >
        <LanguageToggle onChange={setLang} />
        <h1 className="text-2xl font-semibold mb-2">{t.title}</h1>
        <p className="text-sm mb-8 text-gray-700">{t.subtitle}</p>

        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto bg-gray-50 rounded-2xl shadow-md p-6 flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm mb-1">{t.business}</label>
            <input
              required
              type="text"
              value={form.business_name}
              onChange={(e) =>
                setForm({ ...form, business_name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t.email}</label>
            <input
              required
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">{t.type}</label>
            <select
              value={form.request_type}
              onChange={(e) =>
                setForm({ ...form, request_type: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="delete">{t.delete}</option>
              <option value="update">{t.update}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">{t.message}</label>
            <textarea
              rows="4"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="bg-[#00bfa6] hover:bg-[#00a48f] text-white py-2 px-6 rounded-md transition-all"
          >
            {t.submit}
          </button>

          {status.success && (
            <p className="text-green-600 text-sm mt-3">{t.success}</p>
          )}
          {status.error && (
            <p className="text-red-500 text-sm mt-3">{t.error}</p>
          )}
        </form>
      </main>
      <Footer />
    </div>
  );
}
