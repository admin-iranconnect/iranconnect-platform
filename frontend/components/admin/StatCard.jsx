export default function StatCard({ title, value, subtitle }) {
  return (
    <div
      className="
        rounded-xl p-4 border
        border-[var(--border)]
        bg-[var(--card-bg)]
        text-[var(--text)]
        shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
        transition-all duration-300
      "
    >
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs opacity-60 mt-1">{subtitle}</div>}
    </div>
  );
}
