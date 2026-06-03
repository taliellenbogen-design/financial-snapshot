# Financial Snapshot

## Overview
Tool that analyzes the latest quarterly financial reports of publicly-traded US companies.
User enters a company domain (e.g. `apple.com`) → receives a beautiful single-page executive summary dashboard.

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts + Lucide React
- **Backend**: Python FastAPI + Uvicorn
- **Financial Data**: Financial Modeling Prep (FMP) API
- **AI Analysis**: Anthropic Claude API (generates Catalyst / Risk / Outlook highlights)

## Design Language
Matches companion tools (`company-snapshot`, `stack-investigator`):
- Background: `#ECEEF6` — soft lavender-gray
- Cards: white, `rounded-2xl`, subtle shadow, **3px colored top border** per section
- Section labels: small-caps uppercase, colored to match card accent
- Center/hero card: dark navy `#0F172A` background, white text
- Typography: Inter — clean, minimal, no decorative elements
- Accent palette: Indigo · Amber · Blue · Green · Red · Purple
- Fully responsive: 3-column grid on desktop → single column on mobile

## Card Color Assignments
| Card | Accent |
|------|--------|
| Company Info | `#6366F1` Indigo |
| Market Data | `#F59E0B` Amber |
| Revenue Chart | `#3B82F6` Blue |
| Catalyst | `#22C55E` Green |
| Risk | `#EF4444` Red |
| Outlook | `#8B5CF6` Purple |
| Hero (Company) | `#0F172A` Dark navy bg |

## Layout (Desktop)
```
[DARK HERO CARD — full width]
Logo · Name · Ticker · Exchange · Description │ Revenue · Net Income · EPS · Free CF

[3-COLUMN GRID]
LEFT                CENTER              RIGHT
──────────────      ─────────────       ──────────────
Company Info        Revenue Trend       🟢 Catalyst
                    (bar chart)
Market Data                             🔴 Risk
                                        🔮 Outlook
```

## Environment Variables

### Backend (`backend/.env`)
```
FMP_API_KEY=          # financialmodelingprep.com free tier (250 req/day)
ANTHROPIC_API_KEY=    # console.anthropic.com
CLAUDE_MODEL=claude-haiku-4-5   # update to latest available
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=         # empty = use Vite proxy (local dev)
                      # set to backend URL for production
```

## Running Locally
```bash
# Terminal 1 – Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 – Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Deployment (Render.com — matching other tools)
- **Backend**: Web Service · Python · `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend**: Static Site · Build: `npm run build` · Publish: `dist`
- Set `VITE_API_URL` in frontend env to the backend Render URL

## Data Flow
1. User inputs domain → `extract_company_name()` strips TLD
2. FMP `/search` resolves name → ticker (prefers NASDAQ/NYSE)
3. FMP fetches: profile, income statement (8Q), cash flow (5Q), key-metrics
4. Claude API generates 3 highlights from structured financial summary
5. JSON response → React renders dashboard

## Key Files
```
backend/main.py          FastAPI app — FMP + Claude integration
frontend/src/App.jsx     Root component, search state
frontend/src/api.js      fetch wrapper for /api/analyze
frontend/src/components/ All UI cards and chart
frontend/src/utils/      formatters.js (currency, %, numbers)
```
