const API_BASE = import.meta.env.VITE_API_URL || ''

export async function analyzeCompany(domain) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  })

  if (!res.ok) {
    let message = 'Failed to fetch financial data.'
    try {
      const err = await res.json()
      message = err.detail || message
    } catch {}
    throw new Error(message)
  }

  return res.json()
}
