import CompanyCard     from './CompanyCard'
import CompanyInfoCard from './CompanyInfoCard'
import StockChart      from './StockChart'
import ChartCard       from './ChartCard'
import MarginChart     from './MarginChart'
import HighlightCard   from './HighlightCard'
import InsightsSection from './InsightsSection'

export default function FinancialDashboard({ data }) {
  const { company, metrics, revenue_trend, margin_trend, stock_history, highlights, sec_insights } = data

  return (
    <div className="mt-8 space-y-4">

      {/* ── Hero card (dark) ── */}
      <CompanyCard company={company} metrics={metrics} />

      {/* ── Row 1: 4-col info strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CompanyInfoCard company={company} />
        {highlights.map((h, i) => (
          <HighlightCard key={i} highlight={h} />
        ))}
      </div>

      {/* ── Row 2: Executive Brief — full width ── */}
      <InsightsSection insights={sec_insights} />

      {/* ── Row 3: Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StockChart
          data={stock_history}
          ticker={company.ticker}
          currentPrice={metrics.current_price}
        />
        <ChartCard data={revenue_trend} />
        <MarginChart data={margin_trend} />
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 no-print">
        <p className="text-xs text-gray-400">
          Based on <span className="font-medium text-gray-500">{metrics.period}</span> report
          · Data via Yahoo Finance · AI insights by Claude
        </p>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors"
        >
          Download PDF
        </button>
      </div>

    </div>
  )
}
