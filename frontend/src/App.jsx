import { useState } from 'react'
import SearchBar from './components/SearchBar'
import FinancialDashboard from './components/FinancialDashboard'
import { analyzeCompany } from './api'

export default function App() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSearch(domain) {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const result = await analyzeCompany(domain)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setData(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#ECEEF6]">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">

        {/* ── Header ── */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
            <h1 className="text-base font-semibold text-gray-800 tracking-tight">Financial Snapshot</h1>
          </div>
          <p className="text-sm text-gray-400">Enter a company domain to get their latest financial summary</p>
        </header>

        {/* ── Search ── */}
        <SearchBar onSearch={handleSearch} loading={loading} hasData={!!data} onReset={handleReset} />

        {/* ── Error ── */}
        {error && (
          <div className="mt-6 max-w-xl mx-auto p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm text-center">
            ⚠️ {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="mt-20 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Fetching financial reports &amp; generating insights…</span>
          </div>
        )}

        {/* ── Results ── */}
        {data && <FinancialDashboard data={data} />}

      </div>
    </div>
  )
}
