import { useState } from 'react'

const EXAMPLES = [
  { domain: 'apple.com',     label: 'Apple' },
  { domain: 'microsoft.com', label: 'Microsoft' },
  { domain: 'nvidia.com',    label: 'Nvidia' },
  { domain: 'amazon.com',    label: 'Amazon' },
  { domain: 'meta.com',      label: 'Meta' },
]

export default function SearchBar({ onSearch, loading, hasData, onReset }) {
  const [domain, setDomain] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const cleaned = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
    if (cleaned) onSearch(cleaned)
  }

  function handleExample(ex) {
    setDomain(ex.domain)
    onSearch(ex.domain)
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 bg-white rounded-2xl shadow-sm p-1.5 border border-gray-100">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="Enter company domain (e.g. apple.com)"
            className="flex-1 px-3 py-2 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-300"
            disabled={loading}
          />
          {hasData ? (
            <button
              type="button"
              onClick={() => { setDomain(''); onReset() }}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              ← New Search
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {loading ? 'Analyzing…' : 'Analyze →'}
            </button>
          )}
        </div>
      </form>

      {!hasData && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 justify-center mt-3">
          <span className="text-xs text-gray-300">Try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.domain}
              type="button"
              onClick={() => handleExample(ex)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${ex.domain}&sz=32`}
                alt=""
                className="w-3.5 h-3.5 object-contain"
              />
              <span className="text-xs text-gray-600 font-medium">{ex.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
