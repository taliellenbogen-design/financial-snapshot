import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts'
import Tooltip from './Tooltip'

const ACCENT = '#8B5CF6'  // purple

const LINES = [
  { key: 'grossMargin',     name: 'Gross',     color: '#6366F1' },
  { key: 'operatingMargin', name: 'Operating', color: '#F59E0B' },
  { key: 'netMargin',       name: 'Net',       color: '#10B981' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export default function MarginChart({ data }) {
  const filtered = (data || []).filter(d => d.grossMargin !== 0)
  if (!filtered.length) return null

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden h-full"
      style={{ borderTop: `3px solid ${ACCENT}` }}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center mb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
            Margin Trend
          </p>
          <Tooltip text="How much of each $1 in revenue remains after different cost layers. Gross = after production costs. Operating = after R&D & salaries. Net = final profit." />
        </div>
        <p className="text-[10px] text-gray-400 mb-3">% of revenue remaining after costs</p>

        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={filtered}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#F3F4F6', strokeWidth: 1 }} />
              <Legend
                iconType="circle"
                iconSize={7}
                formatter={v => <span className="text-[11px] text-gray-500">{v}</span>}
              />
              {LINES.map(l => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.name}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: l.color }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
