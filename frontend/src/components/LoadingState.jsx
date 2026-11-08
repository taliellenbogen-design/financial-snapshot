const STEPS = [
  { label: 'Looking up the company' },
  { label: 'Fetching financial results' },
  { label: 'Reading SEC quarterly report' },
  { label: 'Generating AI insights' },
  { label: 'Preparing your dashboard' },
]

export default function LoadingState({ step }) {
  return (
    <div className="mt-16 flex justify-center animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 w-full max-w-xs">

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm font-semibold text-gray-800">Analyzing your company</span>
          </div>
          <p className="text-[11px] text-gray-400 pl-3.5">This takes about 20–30 seconds</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const done   = i < step
            const active = i === step
            return (
              <div key={i} className="flex items-center gap-3">

                {/* Status icon */}
                {done ? (
                  <div className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : active ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-100 flex-shrink-0" />
                )}

                {/* Label */}
                <span className={`text-xs transition-all duration-300 ${
                  done   ? 'text-gray-300 line-through'  :
                  active ? 'text-gray-800 font-medium'   :
                           'text-gray-300'
                }`}>
                  {s.label}
                </span>

              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-0.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

      </div>
    </div>
  )
}
