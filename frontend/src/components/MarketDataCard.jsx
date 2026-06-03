import { formatCurrency } from '../utils/formatters'
import Tooltip from './Tooltip'

const ACCENT = '#F59E0B'

const TIPS = {
  'MARKET CAP':   'Total value of all the company\'s shares combined. Think of it as the "price tag" of the entire company.',
  'P/E RATIO':    'How much investors pay for every $1 of profit. A high ratio means high growth expectations.',
  'GROSS MARGIN': '% of revenue left after the direct cost of making the product. The rest covers salaries, R&D, and overhead.',
  'NET MARGIN':   'Final profit from every $1 of revenue, after ALL expenses including taxes.',
  'EBITDA':       'Operating profit before taxes and accounting items like depreciation. Used to compare company performance.',
}

export default function MarketDataCard({ metrics }) {
  const rows = [
    { label: 'MARKET CAP',   value: formatCurrency(metrics.market_cap) },
    { label: 'P/E RATIO',    value: metrics.pe_ratio ? `${metrics.pe_ratio.toFixed(1)}×` : 'N/A' },
    { label: 'GROSS MARGIN', value: metrics.gross_margin != null ? `${metrics.gross_margin.toFixed(1)}%` : 'N/A' },
    { label: 'NET MARGIN',   value: metrics.net_margin  != null ? `${metrics.net_margin.toFixed(1)}%`  : 'N/A' },
    { label: 'EBITDA',       value: formatCurrency(metrics.ebitda) },
  ]

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden h-full"
      style={{ borderTop: `3px solid ${ACCENT}` }}
    >
      <div className="p-4">
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: ACCENT }}
        >
          Market Data
        </p>

        <div className="space-y-3">
          {rows.map(({ label, value }) => (
            <div key={label}>
              <div className="flex items-center">
                <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
                <Tooltip text={TIPS[label]} />
              </div>
              <p className="text-xs text-gray-800 font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
