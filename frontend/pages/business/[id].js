//frontend/pages/business/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import RatingStars from "../../components/RatingStars";
import { X } from "lucide-react";
import { getCountryCallingCode } from "libphonenumber-js";
import ClaimBusinessWidget from "../../components/ClaimBusinessWidget";

export default function Detail() {
  const router = useRouter();
  const { id } = router.query;
  const [biz, setBiz] = useState(null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("light");
  const [showImageModal, setShowImageModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🟢 بررسی تم فعال
  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current);
    const observer = new MutationObserver(() => {
      const newTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // 🟢 بررسی وضعیت لاگین کاربر
  useEffect(() => {
    const token = localStorage.getItem("iran_token");
    setIsLoggedIn(!!token);
  }, []);

  // 🟢 دریافت اطلاعات بیزینس
  useEffect(() => {
    if (!id) return;
    axios
      .get(
        `${
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
        }/api/businesses/${id}`
      )
      .then((r) => setBiz(r.data))
      .catch(console.error);
  }, [id]);

  // ⭐ ثبت امتیاز
  async function submitRating() {
    const token = localStorage.getItem("iran_token");
    if (!token) {
      setMessage("You must be logged in to rate.");
      return;
    }
    try {
      await axios.post(
        `${
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
        }/api/businesses/${id}/ratings`,
        { score: rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("✅ Rating submitted");
      const r = await axios.get(
        `${
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
        }/api/businesses/${id}`
      );
      setBiz(r.data);
    } catch (e) {
      setMessage(e.response?.data?.error || "Error");
    }
  }

  if (!biz)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-[#0a1d37]">
        <p>Loading...</p>
      </div>
    );

  // 📸 تصویر بیزینس
  const imageSrc = biz.image_url
  ? (
      biz.image_url.startsWith("http")
        ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/cdn?url=${encodeURIComponent(biz.image_url)}`
        : `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}${biz.image_url}`
    )
  : "/logo.png";

  // 📞 تلفن با کد کشور
  const phoneWithCode =
    biz?.phone && biz?.country
      ? `+${getCountryCallingCode(biz.country)} ${biz.phone}`
      : biz?.phone || "";

  // 📍 لینک Google Maps
  const googleMapsLink =
    biz?.lat && biz?.lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${biz.address} @${biz.lat},${biz.lng}`
        )}`
      : null;

  // 📧 ایمیل ضد اسپم
  const obfuscatedEmail = biz?.email
    ? biz.email.replace("@", " [at] ")
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#ffffff",
        color: theme === "dark" ? "#ffffff" : "#0a1d37",
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
        {/* 🎨 کارت جزئیات بیزینس */}
        <div
          className="rounded-2xl p-8 w-full max-w-2xl border transition-all duration-300 text-center md:text-left"
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
          <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
            {/* 🖼 تصویر بیزینس */}
            <img
              src={imageSrc}
              alt={biz.name}
              className="w-40 h-40 md:w-48 md:h-48 rounded-xl object-cover border border-gray-300 shadow-md cursor-pointer hover:opacity-90 transition mx-auto md:mx-0"
              onClick={() => setShowImageModal(true)}
            />

            {/* جزئیات */}
            <div className="flex-1 flex flex-col items-center md:items-start space-y-3 leading-relaxed">
              {/* 🏅 نام بیزینس با تیک تأیید */}
              <h1 className="text-2xl font-semibold flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start gap-1 md:gap-2">              
                <span className="order-2 md:order-none">{biz.name}</span>
                {biz.owner_verified && (
                  <span
                    className="text-2xl leading-none order-1 md:order-none"
                    title="Verified Business"
                  >
                    🎖️
                  </span>
                )}  
              </h1>

              <p
                className="text-sm text-center md:text-left"
                style={{
                  color: theme === "dark" ? "#e2e8f0" : "#555",
                }}
              >
                {biz.category} • {biz.city}
              </p>

              {/* 🆕 آدرس */}
              {biz.address && (
                <p className="text-center md:text-left">
                  📍{" "}
                  {isLoggedIn && googleMapsLink ? (
                    <a
                      href={googleMapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-turquoise hover:underline"
                    >
                      {biz.address}
                    </a>
                  ) : (
                    biz.address
                  )}
                </p>
              )}
              {/* 🔒 اطلاعات فقط برای کاربران لاگین‌کرده */}
              {isLoggedIn ? (
                <div className="text-center md:text-left space-y-3">
                  {phoneWithCode && <p>📞 {phoneWithCode}</p>}

                  {obfuscatedEmail && (
                    <p>
                      📧{" "}
                      <a
                        href={`mailto:${biz.email}`}
                        className="text-turquoise hover:underline"
                      >
                        {obfuscatedEmail}
                      </a>
                    </p>
                  )}

                  {biz.website && (
                    <p>
                      🌐{" "}
                      <a
                        href={biz.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-turquoise font-medium hover:underline"
                      >
                        Visit Website
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <button
                  className="btn-primary mt-3 w-full sm:w-auto"
                  onClick={() =>
                    router.push(`/auth/login?redirect=/business/${id}`)
                  }
                >
                  Login to see contact information
                </button>
              )}

              <p className="pt-2 text-lg font-medium text-turquoise text-center md:text-left">
                ⭐ {biz.avg_rating ?? "—"}
              </p>
            </div>
          </div>

          {/* ⭐ امتیازدهی */}
          <div
            className="mt-8 border-t pt-6 text-center md:text-left"
            style={{
              borderColor:
                theme === "dark"
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(0,0,0,0.1)",
            }}
          >
            <h3 className="text-lg font-semibold mb-3">Rate this business</h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-3 text-center">
              <div className="flex justify-center w-full sm:w-auto">
                <RatingStars value={rating} onChange={setRating} color="#40E0D0" />
              </div>

              <button
                className="btn-primary w-full sm:w-auto"
                onClick={submitRating}
                disabled={!rating}
              >
                Submit
              </button>
            </div>

            {message && (
              <p
                className={`mt-3 text-sm ${
                  message.includes("✅") ? "text-green-500" : "text-red-400"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          {/* 🆕 Claim Business Widget */}
          <div className="mt-10 border-t pt-6 text-center">
            {biz.owner_verified ? (
              <div className="text-green-600 font-medium">
                🎖️ This business has been verified by its owner.
              </div>
            ) : isLoggedIn ? (
              <ClaimBusinessWidget businessId={id} />
            ) : (
              <div>
                <p className="mb-3 text-sm text-white-600">
                  Are you the owner of this business?
                </p>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={() =>
                    router.push(`/auth/login?redirect=/business/${id}`)
                  }
                >
                  Claim this business
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* 🖼 مودال نمایش تصویر */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-3xl w-full px-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-8 right-2 text-white hover:text-turquoise transition"
            >
              <X size={28} />
            </button>
            <img
              src={imageSrc}
              alt={biz.name}
              className="rounded-2xl w-full h-auto max-h-[85vh] object-contain shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
