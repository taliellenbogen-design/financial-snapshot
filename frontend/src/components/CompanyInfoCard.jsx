import { formatEmployees } from '../utils/formatters'

const ACCENT = '#6366F1'

export default function CompanyInfoCard({ company }) {
  // Simplify finance-jargon sector names for business readers
  const SECTOR_MAP = {
    'Consumer Cyclical':      'Consumer & Retail',
    'Consumer Defensive':     'Consumer Staples',
    'Communication Services': 'Media & Telecom',
    'Financial Services':     'Finance',
    'Basic Materials':        'Materials',
  }
  const sector = SECTOR_MAP[company.sector] ?? company.sector

  const rows = [
    { label: 'SECTOR',     value: sector },
    { label: 'INDUSTRY',   value: company.industry },
    { label: 'CEO',        value: company.ceo },
    { label: 'EMPLOYEES',  value: formatEmployees(company.employees) },
    { label: 'WEBSITE',    value: company.website, isLink: true },
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
          Company Info
        </p>

        <div className="space-y-3">
          {rows.map(({ label, value, isLink }) => (
            <div key={label}>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
              {isLink && value ? (
                <a
                  href={value.startsWith('http') ? value : `https://${value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-500 hover:underline mt-0.5 block truncate"
                >
                  {value}
                </a>
              ) : (
                <p className="text-xs text-gray-800 font-medium mt-0.5">{value || 'N/A'}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
