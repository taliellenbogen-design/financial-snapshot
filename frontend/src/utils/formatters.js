/**
 * Format a large currency number → $12.3B / $450M / $1.2T
 */
export function formatCurrency(n) {
  if (n === null || n === undefined) return 'N/A'
  const a = Math.abs(n)
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (a >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (a >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  if (a >= 1e3)  return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

/**
 * Short version for chart Y-axis (no $ prefix) → 12.3B / 450M
 */
export function formatAxisValue(n) {
  if (n === null || n === undefined) return ''
  const a = Math.abs(n)
  if (a >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (a >= 1e9)  return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6)  return `${(n / 1e6).toFixed(0)}M`
  return `${n.toFixed(0)}`
}

/**
 * Format a YoY percentage change → +12.3% / -4.1%
 */
export function formatYoY(n) {
  if (n === null || n === undefined) return null
  const prefix = n > 0 ? '+' : ''
  return `${prefix}${n.toFixed(1)}%`
}

/**
 * Format employee count → 164,000
 */
export function formatEmployees(n) {
  if (!n) return 'N/A'
  const num = typeof n === 'string' ? parseInt(n.replace(/,/g, ''), 10) : n
  if (isNaN(num)) return String(n)
  return num.toLocaleString()
}
