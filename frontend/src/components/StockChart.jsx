import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'

const ACCENT = '#0EA5E9'   // sky blue

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-2.5 text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

export default function StockChart({ data, ticker, currentPrice }) {
  if (!data?.length) return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden h-full flex items-center justify-center"
      style={{ borderTop: `3px solid ${ACCENT}`, minHeight: 180 }}
    >
      <p className="text-xs text-gray-400">Stock data unavailable</p>
    </div>
  )

  // Filter out sentinel / invalid values yfinance sometimes returns
  // Also filter statistical outliers: keep only prices within 10× of the median
  const rawClean = data.filter(d => d.price > 0 && d.price < 1_000_000)
  const sorted   = [...rawClean.map(d => d.price)].sort((a, b) => a - b)
  const median   = sorted[Math.floor(sorted.length / 2)] || 1
  const clean    = rawClean.filter(d => d.price > median / 10 && d.price < median * 10)
  const prices  = clean.map(d => d.price)
  const minP    = Math.min(...prices)
  const maxP    = Math.max(...prices)
  const change  = prices.length > 1
    ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    : 0
  const up      = change >= 0
  const color   = up ? '#10B981' : '#EF4444'

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden h-full"
      style={{ borderTop: `3px solid ${ACCENT}` }}
    >
      <div className="p-4 h-full flex flex-col">

        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              Stock Price
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">12-month history · {ticker}</p>
          </div>
          <div className="text-right">
            {currentPrice > 0 && (
              <p className="text-sm font-bold text-gray-900">${currentPrice.toFixed(2)}</p>
            )}
            <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>
              {up ? '+' : ''}{change.toFixed(1)}% past year
            </p>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={clean} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={v => `$${v}`}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={52}
                domain={[minP * 0.97, maxP * 1.03]}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={ACCENT}
                strokeWidth={2}
                fill="url(#stockGrad)"
                dot={false}
                activeDot={{ r: 3, fill: ACCENT }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
