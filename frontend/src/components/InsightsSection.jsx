const ACCENT_COLORS = [
  '#6366F1', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444',
]

export default function InsightsSection({ insights }) {
  if (!insights) return null

  const { headline, insights: points = [] } = insights
  if (!headline && !points.length) return null

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ borderTop: '3px solid #0F172A' }}
    >
      <div className="px-5 py-4 sm:px-6">

        {/* Header row */}
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A]">
            Executive Brief
          </p>
          <span className="text-[10px] text-gray-400">· from SEC 10-Q filing</span>
          <div className="flex-1 h-px bg-gray-100" />
          {headline && (
            <p className="text-xs font-medium text-gray-600 italic max-w-lg text-right">
              "{headline}"
            </p>
          )}
        </div>

        {/* 4 bullets in one row on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
          {points.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}
              />
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-semibold">{point.title}:</span>
                {' '}
                <span className="text-gray-500">{point.text}</span>
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
