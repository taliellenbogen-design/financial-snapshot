import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatAxisValue, formatCurrency } from '../utils/formatters'

const ACCENT    = '#3B82F6'
const COLOR_REV = '#6366F1'
const COLOR_NI  = '#10B981'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ChartCard({ data }) {
  const filtered = (data || []).filter(d => d.revenue > 0 || d.netIncome !== 0)

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden h-full"
      style={{ borderTop: `3px solid ${ACCENT}` }}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="mb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
            Revenue Trend
          </p>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">Total income vs. profit over the last 4 quarters</p>

        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={filtered}
              barGap={3}
              barCategoryGap="28%"
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
                tickFormatter={v => `$${formatAxisValue(v)}`}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
              <Legend
                iconType="circle"
                iconSize={7}
                formatter={v => <span className="text-[11px] text-gray-500">{v}</span>}
              />
              <Bar dataKey="revenue"   name="Revenue"    fill={COLOR_REV} radius={[4, 4, 0, 0]} />
              <Bar dataKey="netIncome" name="Net Income" fill={COLOR_NI}  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
