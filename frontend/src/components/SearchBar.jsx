import { useState } from 'react'

const EXAMPLES = ['apple.com', 'microsoft.com', 'nvidia.com', 'amazon.com', 'meta.com']

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
    setDomain(ex)
    onSearch(ex)
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
              key={ex}
              type="button"
              onClick={() => handleExample(ex)}
              disabled={loading}
              className="text-xs text-indigo-400 hover:text-indigo-600 hover:underline disabled:opacity-40 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
