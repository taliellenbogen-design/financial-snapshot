const ACCENT_MAP = {
  catalyst: { border: '#22C55E', label: '#16A34A' },
  risk:     { border: '#EF4444', label: '#DC2626' },
  outlook:  { border: '#8B5CF6', label: '#7C3AED' },
}

export default function HighlightCard({ highlight }) {
  const { type, label, emoji, title, text } = highlight
  const { border, label: labelColor } = ACCENT_MAP[type] || { border: '#6366F1', label: '#4F46E5' }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ borderTop: `3px solid ${border}` }}
    >
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">{emoji}</span>
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: labelColor }}
          >
            {label}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-1 leading-snug">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
