//frontend/components/BusinessCard.jsx
import Link from 'next/link';

export default function BusinessCard({ b }) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
  // ✅ اصلاح شده: پشتیبانی از آدرس‌های Cloudinary (http/https)
  const imageSrc = b.image_url
  ? (
      b.image_url.startsWith("http")
        ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/cdn?url=${encodeURIComponent(b.image_url)}`
        : `${apiBase}${b.image_url}`
    )
  : b.logo_url
  ? (
      b.logo_url.startsWith("http")
        ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/cdn?url=${encodeURIComponent(b.logo_url)}`
        : `${apiBase}${b.logo_url}`
    )
  : "/logo.png";
  
  return (
    <Link href={`/business/${b.id}`} className="block group w-full">
      <div
        className="admin-card flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-between 
        gap-4 p-5 transition-all duration-300 text-center sm:text-left"
      >
        {/* تصویر بیزینس */}
        <img
          src={imageSrc}
          alt={`${b.name} logo`}
          className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover border border-[var(--border)] mb-2 sm:mb-0"
        />

        {/* جزئیات */}
        <div className="flex flex-col flex-1 min-w-0 items-center sm:items-start">
          {/* 🏅 نام بیزینس + نشان تأیید */}
          <h3 className="text-[var(--text)] font-semibold text-base group-hover:text-turquoise transition flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 text-center sm:text-left">
            

            <span className="truncate order-2 sm:order-none">{b.name}</span>
            {b.owner_verified && (
              <span
                className="text-lg order-1 sm:order-none mb-1 sm:mb-0"
                title="Verified Business"
              >
                🎖️
              </span>
            )}
          </h3>


          <p className="text-sm text-muted text-center sm:text-left">
            {b.category}
            {b.sub_category ? ` • ${b.sub_category}` : ''} • {b.city}
            {b.country ? `, ${b.country}` : ''}
          </p>
        </div>

        {/* امتیاز */}
        <div className="text-turquoise font-semibold text-sm mt-3 sm:mt-0 text-center sm:text-right">
          ⭐ {b.avg_rating ?? '—'}
        </div>
      </div>
    </Link>
  );
}
