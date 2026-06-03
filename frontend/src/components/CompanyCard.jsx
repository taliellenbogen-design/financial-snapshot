import { formatCurrency, formatYoY } from '../utils/formatters'
import Tooltip from './Tooltip'

const KPI = [
  { key: 'revenue',     yoyKey: 'revenue_yoy',    label: 'Revenue',      tip: null },
  { key: 'net_income',  yoyKey: 'net_income_yoy', label: 'Net Income',   tip: 'Total profit after all expenses and taxes.' },
  { key: 'gross_margin', yoyKey: null,            label: 'Gross Margin', tip: 'Revenue left after production costs. Higher = more efficient / stronger pricing power.', format: v => `${(v ?? 0).toFixed(1)}%` },
  { key: 'market_cap',  yoyKey: null,             label: 'Market Cap',   tip: 'Total value of all the company\'s shares combined — the "price tag" of the entire company.' },
]

export default function CompanyCard({ company, metrics }) {
  const [logoError, setLogoError] = useState(false)

  return (
    <div className="rounded-2xl bg-[#0F172A] text-white p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start gap-5">

        {/* Left — identity */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex-shrink-0">
            {company.logo && !logoError ? (
              <img
                src={company.logo}
                alt={company.name}
                className="w-12 h-12 rounded-xl object-contain bg-white p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold">
                {(company.name || '?')[0]}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-bold leading-tight">{company.name}</h2>
              <span className="px-2 py-0.5 bg-white/10 rounded-lg text-xs font-mono">{company.ticker}</span>
              {company.exchange && (
                <span className="px-2 py-0.5 bg-white/10 rounded-lg text-xs text-slate-300">{company.exchange}</span>
              )}
            </div>
            {company.description && (
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 max-w-lg">
                {company.description}
              </p>
            )}
          </div>
        </div>

        {/* Right — KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0 w-full sm:w-auto">
          {KPI.map(({ key, yoyKey, label, tip, format }) => {
            const val    = metrics[key]
            const change = metrics[yoyKey]
            const display = format ? format(val ?? 0) : formatCurrency(val)
            const yoyStr  = formatYoY(change)
            return (
              <div key={key} className="bg-white/5 hover:bg-white/8 transition-colors rounded-xl p-3">
                <div className="flex items-center mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
                  {tip && <Tooltip text={tip} />}
                </div>
                <p className="text-sm font-bold">{display}</p>
                {yoyStr && (
                  <p className={`text-[11px] font-medium mt-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {yoyStr} YoY
                  </p>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// Needs useState — import it
import { useState } from 'react'
