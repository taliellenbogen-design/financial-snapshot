from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import httpx
import os
import json
import re
import time
import yfinance as yf
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL      = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5")
FRONTEND_URL      = os.getenv("FRONTEND_URL", "http://localhost:5173")

SEC_HEADERS = {
    "User-Agent": "FinancialSnapshot/1.0 (research tool; contact: research@financialsnapshot.app)",
    "Accept-Encoding": "gzip, deflate",
}

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Financial Snapshot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://financial-snapshot-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    domain: str

# ── Simple rate limiter (max 5 requests per IP per minute) ───────────────────
_rate_store: dict[str, list[float]] = {}
RATE_LIMIT   = 5    # max requests
RATE_WINDOW  = 60   # seconds

def check_rate_limit(ip: str):
    now  = time.time()
    hits = [t for t in _rate_store.get(ip, []) if now - t < RATE_WINDOW]
    if len(hits) >= RATE_LIMIT:
        raise HTTPException(429, "Too many requests — please wait a minute.")
    hits.append(now)
    _rate_store[ip] = hits

# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_company_name(domain: str) -> str:
    name = domain.lower().strip()
    for prefix in ("https://", "http://", "www."):
        if name.startswith(prefix):
            name = name[len(prefix):]
    return name.split(".")[0]

def safe_val(series, key, default=0.0) -> float:
    try:
        val = series.loc[key]
        return float(val) if not pd.isna(val) else default
    except (KeyError, TypeError, ValueError):
        return default

def yoy(current: float, previous: float):
    if previous and previous != 0:
        return round(((current - previous) / abs(previous)) * 100, 1)
    return None

def fmt(n) -> str:
    if n is None: return "N/A"
    n = float(n)
    a = abs(n)
    if a >= 1e12: return f"${n/1e12:.2f}T"
    if a >= 1e9:  return f"${n/1e9:.2f}B"
    if a >= 1e6:  return f"${n/1e6:.1f}M"
    return f"${n:,.0f}"

def quarter_label(dt) -> str:
    try:
        ts = pd.Timestamp(dt)
        q = (ts.month - 1) // 3 + 1
        return f"Q{q} {ts.year}"
    except Exception:
        return str(dt)[:7]

# ── SEC EDGAR helpers ─────────────────────────────────────────────────────────
async def get_cik(ticker: str) -> str | None:
    """Map ticker symbol → CIK number via SEC EDGAR."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://www.sec.gov/files/company_tickers.json",
                headers=SEC_HEADERS
            )
            if r.status_code == 200:
                for entry in r.json().values():
                    if entry.get("ticker", "").upper() == ticker.upper():
                        return str(entry["cik_str"])
    except Exception as e:
        print(f"[SEC CIK] {e}")
    return None

def strip_html(html: str) -> str:
    """Strip HTML tags and clean up whitespace."""
    html = re.sub(r'<(script|style)[^>]*>[\s\S]*?</(script|style)>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'<[^>]+>', ' ', html)
    html = (html
        .replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        .replace('&nbsp;', ' ').replace('&#160;', ' ')
        .replace('&ldquo;', '"').replace('&rdquo;', '"')
        .replace('&lsquo;', "'").replace('&rsquo;', "'")
        .replace('&mdash;', '—').replace('&ndash;', '–')
        .replace('&#8217;', "'").replace('&#8216;', "'")
        .replace('’', "'").replace('‘', "'")   # curly → straight apostrophe
    )
    html = re.sub(r'[ \t]{2,}', ' ', html)
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip()

def extract_mda(text: str) -> str:
    """Extract MD&A section — body section only, not TOC entry."""
    text_lower = text.lower()

    end_markers = [
        "item 3.", "item\xa03.", "item 3 –", "item 3—",
        "quantitative and qualitative disclosures about market risk",
    ]

    def nearest_end(start_pos: int) -> int:
        """Closest end marker after start_pos (no minimum gap)."""
        end = len(text)
        for m in end_markers:
            p = text_lower.find(m, start_pos)
            if p != -1 and p < end:
                end = p
        return end

    def find_end(start_pos: int, min_gap: int = 1000) -> int:
        """Find end marker at least min_gap chars after start_pos."""
        end = len(text)
        for m in end_markers:
            p = text_lower.find(m, start_pos + min_gap)
            if p != -1 and p < end:
                end = p
        return end

    # ── Strategy 1: ALL-CAPS section heading ─────────────────────────────────
    # In iXBRL 10-Qs the body heading is ALL CAPS; TOC is mixed case.
    # strip_html() already normalized curly apostrophes → straight.
    for phrase in [
        "MANAGEMENT'S DISCUSSION AND ANALYSIS",
        "MANAGEMENT’S DISCUSSION AND ANALYSIS",  # safety fallback
    ]:
        pos = text.find(phrase)
        if pos != -1:
            end_pos = find_end(pos, min_gap=1000)
            section = text[pos:end_pos]
            if len(section) >= 1000:
                print(f"[SEC] MD&A via ALL-CAPS heading: {len(section)} chars at pos {pos}")
                return section[:14000]

    # ── Strategy 2: TOC-aware Item 2 search ──────────────────────────────────
    start_markers = [
        "item 2.", "item\xa02.", "item 2 –", "item 2—",
        "management's discussion and analysis",
        "management's discussion",
    ]

    all_starts = []
    for m in start_markers:
        scan = 0
        while True:
            found = text_lower.find(m, scan)
            if found == -1:
                break
            all_starts.append(found)
            scan = found + 1

    if not all_starts:
        print("[SEC] No MD&A markers found")
        return text[:10000]

    all_starts = sorted(set(all_starts))

    # TOC entries have their paired end marker within ~1000 chars → skip them
    body_starts = [
        sp for sp in all_starts
        if (nearest_end(sp) - sp) > 1000
    ]
    if not body_starts:
        body_starts = all_starts  # nothing qualified — use all

    # Among body candidates pick the one with the most content
    best_start, best_len = body_starts[0], 0
    for sp in body_starts:
        ep = find_end(sp, min_gap=1000)
        length = ep - sp
        if length > best_len:
            best_len = length
            best_start = sp

    end_pos = find_end(best_start, min_gap=1000)
    section = text[best_start:end_pos]
    print(f"[SEC] MD&A section: {len(section)} chars at pos {best_start}")

    if len(section) >= 500:
        return section[:14000]

    print("[SEC] Section still short — falling back")
    return text[:10000]

async def _find_10q_htm(
    client: httpx.AsyncClient, cik: str, acc_no_nodash: str,
    acc_no_dashed: str, primary_doc: str
) -> str | None:
    """
    Return the URL of the best HTML document for a 10-Q filing.
    Tries primaryDocument first; if that's empty, scans the filing index
    JSON for the largest .htm file (the full iXBRL report).
    """
    base_url    = f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc_no_nodash}"
    primary_url = f"{base_url}/{primary_doc}"

    # ── Quick pre-check: is primaryDocument the actual report? ────────────────
    # HEAD request to get Content-Length without downloading the full file
    try:
        head_r = await client.head(primary_url, headers=SEC_HEADERS, timeout=15.0)
        content_len = int(head_r.headers.get("content-length", 0))
        print(f"[SEC] Primary doc HEAD: status={head_r.status_code}, size={content_len:,} bytes")
        if head_r.status_code == 200 and content_len > 50_000:
            # Large enough to likely contain a full 10-Q — use it
            return primary_url
    except Exception as e:
        print(f"[SEC] HEAD check error: {e}")
        return primary_url   # can't check — proceed with primary

    # ── Scan filing index for the largest .htm ────────────────────────────────
    # EDGAR hosts a JSON directory listing at: {acc_no_dashed}-index.json
    index_url = f"{base_url}/{acc_no_dashed}-index.json"
    try:
        idx_r = await client.get(index_url, headers=SEC_HEADERS, timeout=15.0)
        if idx_r.status_code == 200:
            files = idx_r.json().get("directory", {}).get("item", [])
            htm_files = [
                f for f in files
                if isinstance(f, dict)
                and f.get("name", "").lower().endswith((".htm", ".html"))
                and not re.search(r"ex[-_]?\d", f.get("name", "").lower())  # skip exhibits
            ]
            if htm_files:
                best = max(htm_files, key=lambda f: int(f.get("size", 0) or 0))
                best_url = f"{base_url}/{best['name']}"
                print(f"[SEC] Best HTM from index: {best['name']} ({best.get('size')} bytes) → {best_url}")
                return best_url
            else:
                print(f"[SEC] No .htm files found in index")
    except Exception as e:
        print(f"[SEC] Index scan error: {e}")

    return primary_url   # fallback


async def fetch_10q_mda(ticker: str) -> str | None:
    """Fetch MD&A text from the latest 10-Q filing on SEC EDGAR."""
    cik = await get_cik(ticker)
    if not cik:
        print(f"[SEC] CIK not found for {ticker}")
        return None

    padded_cik = str(int(cik)).zfill(10)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Get filing submissions list
            subs_r = await client.get(
                f"https://data.sec.gov/submissions/CIK{padded_cik}.json",
                headers=SEC_HEADERS,
                timeout=20.0,
            )
            if subs_r.status_code != 200:
                print(f"[SEC] submissions.json status={subs_r.status_code} for CIK {padded_cik}")
                return None

            subs   = subs_r.json()
            recent = subs.get("filings", {}).get("recent", {})

            forms        = recent.get("form", [])
            accs         = recent.get("accessionNumber", [])
            primary_docs = recent.get("primaryDocument", [])

            print(f"[SEC] CIK={cik} ({padded_cik}) — scanning {len(forms)} recent filings for 10-Q")

            # Find latest 10-Q
            for i, form in enumerate(forms):
                if form != "10-Q":
                    continue

                acc_dashed  = accs[i]                   # e.g. "0001018724-24-000037"
                acc_nodash  = acc_dashed.replace("-", "")  # e.g. "000101872424000037"
                primary_doc = primary_docs[i] if i < len(primary_docs) else None
                if not primary_doc:
                    print(f"[SEC] No primaryDocument at index {i}")
                    continue

                print(f"[SEC] Found 10-Q: accession={acc_dashed}, primaryDoc={primary_doc}")

                doc_url = await _find_10q_htm(client, cik, acc_nodash, acc_dashed, primary_doc)
                if not doc_url:
                    continue

                try:
                    doc_r = await client.get(doc_url, headers=SEC_HEADERS, timeout=60.0)
                except httpx.TimeoutException:
                    print(f"[SEC] Timeout fetching {doc_url}")
                    continue

                if doc_r.status_code != 200:
                    print(f"[SEC] Got HTTP {doc_r.status_code} for {doc_url}")
                    continue

                raw   = doc_r.text
                clean = strip_html(raw)
                print(f"[SEC] Raw HTML: {len(raw):,} chars | Stripped: {len(clean):,} chars")

                if len(clean) < 500:
                    print(f"[SEC] Text too short after strip: {clean[:200]}")
                    continue

                mda = extract_mda(clean)
                print(f"[SEC] MD&A extracted: {len(mda):,} chars")

                # Fallback: if extraction is still too short, try 40-50% into the doc.
                # MD&A typically sits after the financial tables (40–65% of a 10-Q).
                if len(mda) < 1000 and len(clean) > 5000:
                    for pct in [0.40, 0.45, 0.50, 0.35]:
                        mid = int(len(clean) * pct)
                        candidate = clean[mid: mid + 14000]
                        if len(candidate) >= 1000:
                            mda = candidate
                            print(f"[SEC] Fallback at {int(pct*100)}%: {len(mda):,} chars from pos {mid}")
                            break

                return mda

    except Exception as e:
        print(f"[SEC fetch] {e}")

    return None

# ── Claude calls ──────────────────────────────────────────────────────────────
def get_highlights(data: str) -> list:
    """Generate 3 plain-language highlights for business professionals."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": f"""Write 3 short business highlights for someone in sales or business development.

WHO IS READING THIS:
Someone smart who reads the news — but has never studied finance.
They understand: sales going up is good, profit matters, debt can be risky.
They don't know financial instruments or accounting terms.

HOW TO WRITE:
Speak like a knowledgeable colleague, not an analyst.
Use only common, everyday words — the kind you'd text a friend.
No unusual vocabulary, metaphors, or idioms. Simple and direct.
Before every sentence ask: "Would a non-native English speaker get this instantly?"
If not — say it differently, or skip it.

HARD RULES:
- Each "text" field: max 2 sentences, max 20 words total.
- If revenue dropped vs last quarter, say WHY (seasonality? one-off event?) — don't just flag it.
- Only use facts from the data below. No added context from training data.

GOOD vs BAD:
Bad: "FCF deterioration: Free cash flow negative $18B; working capital pressure evident."
Good: "Cash tight this quarter: Amazon spent more than it earned — typical after the holiday rush."

Bad: "P/E of 37× signals premium valuation relative to historical averages."
Good: "Stock is pricey: investors are betting heavily on future growth continuing."

Return ONLY valid JSON:
[
  {{"type":"catalyst","label":"CATALYST","emoji":"🟢","title":"2-4 word title","text":"What's going well, in plain terms."}},
  {{"type":"risk","label":"RISK","emoji":"🔴","title":"2-4 word title","text":"Main concern — explained simply, with context."}},
  {{"type":"outlook","label":"OUTLOOK","emoji":"🔮","title":"2-4 word title","text":"What to watch next, in plain language."}}
]

Data:
{data}"""
            }]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        print(f"[Claude highlights] {e}")
        return [
            {"type": "catalyst", "label": "CATALYST", "emoji": "🟢",
             "title": "Revenue Growth", "text": "The company grew its revenue compared to last year."},
            {"type": "risk", "label": "RISK", "emoji": "🔴",
             "title": "Watch Margins", "text": "Profit margins may face pressure in the coming quarters."},
            {"type": "outlook", "label": "OUTLOOK", "emoji": "🔮",
             "title": "Steady Footing", "text": "The business is on solid ground heading into next quarter."},
        ]

def get_sec_insights(mda_text: str, company_name: str) -> dict | None:
    """Extract a free-form executive brief from MD&A — no forced categories."""
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": f"""Read {company_name}'s latest 10-Q filing excerpt and write 5 short insights for a business professional in sales or account management.

WHO IS READING THIS:
Someone smart who reads the news and understands business — but has never studied finance or worked at a bank.
They know: revenue = sales, profit = what's left over, growth is good, debt is risky.
They don't know: financial instruments, accounting mechanics, or investment terminology.

HOW TO WRITE:
Imagine explaining this over coffee to a sharp colleague before a client meeting.
Before writing each sentence, ask: "Would a non-native English speaker understand this instantly?"
Use only common, everyday words — the kind you'd use in a Slack message or email.
No unusual vocabulary, no metaphors, no idioms. Simple and direct.

HARD RULES — follow exactly:
1. Exactly 4 insights. Not 3, not 5. Four.
2. Each "text": ONE sentence, maximum 15 words. Count every word. If you hit 16, cut one word.
3. Every company name, number, and specific fact MUST appear verbatim in the MD&A text. If you cannot find it there, do not write it.
4. No background from your own training data — not even to "add context."

Example of correct length (count: 13 words):
"Revenue nearly doubled — profits grew 3× faster because costs barely moved."

Example too long (count: 22 words — NOT acceptable):
"Revenue jumped 85% to $81.6B year-over-year, with gross profit margin holding steady at 75% as costs barely moved."

Return ONLY valid JSON (no markdown):
{{
  "headline": "One plain sentence. Max 15 words.",
  "insights": [
    {{"title": "2–4 word label", "text": "One sentence. Max 15 words."}}
  ]
}}

MD&A:
{mda_text}"""
            }]
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        cleaned = raw.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as je:
            print(f"[Claude SEC insights] JSON parse error: {je}")
            print(f"[Claude SEC insights] Raw response (first 500): {cleaned[:500]}")
            return None
    except Exception as e:
        print(f"[Claude SEC insights] {e}")
        return None

# ── Main route ────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest, request: Request):
    check_rate_limit(request.client.host)
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")

    domain       = req.domain.strip().lower()
    company_name = extract_company_name(domain)

    # ── 1. Resolve domain → ticker ───────────────────────────────────────────
    ticker_symbol = None
    US_EXCHANGES  = {"NMS", "NYQ", "NGM", "NCM", "ASE", "PCX", "BTS"}

    try:
        search = yf.Search(company_name, max_results=10)
        quotes = search.quotes or []
        for q in quotes:
            if q.get("quoteType") == "EQUITY" and q.get("exchange") in US_EXCHANGES:
                ticker_symbol = q["symbol"]
                break
        if not ticker_symbol:
            for q in quotes:
                if q.get("quoteType") == "EQUITY":
                    ticker_symbol = q["symbol"]
                    break
        if not ticker_symbol and quotes:
            ticker_symbol = quotes[0].get("symbol")
    except Exception as e:
        print(f"[yfinance search] {e}")

    if not ticker_symbol:
        raise HTTPException(404, f"No US-listed company found for '{domain}'.")

    # ── 2. Fetch financial data from Yahoo Finance ───────────────────────────
    try:
        ticker   = yf.Ticker(ticker_symbol)
        info     = ticker.info or {}
        income_q = ticker.quarterly_income_stmt
        cf_q     = ticker.quarterly_cashflow
    except Exception as e:
        print(f"[yfinance data] {e}")
        raise HTTPException(503, f"Could not retrieve financial data for {ticker_symbol}")

    if income_q is None or income_q.empty:
        raise HTTPException(404, f"No income statement data for {ticker_symbol}")

    # ── 3. Process numbers ───────────────────────────────────────────────────
    cols     = income_q.columns.tolist()
    latest   = income_q[cols[0]]
    yoy_base = income_q[cols[4]] if len(cols) > 4 else None

    revenue      = safe_val(latest, "Total Revenue")
    net_income   = safe_val(latest, "Net Income")
    gross_profit = safe_val(latest, "Gross Profit")

    prev_revenue    = safe_val(yoy_base, "Total Revenue") if yoy_base is not None else 0
    prev_net_income = safe_val(yoy_base, "Net Income")    if yoy_base is not None else 0

    revenue_yoy    = yoy(revenue, prev_revenue)
    net_income_yoy = yoy(net_income, prev_net_income)
    gross_margin   = round(gross_profit / revenue * 100, 1) if revenue else 0
    net_margin     = round(net_income   / revenue * 100, 1) if revenue else 0

    eps    = float(info.get("trailingEps") or 0)
    ebitda = float(info.get("ebitda")      or 0)
    mkt_cap = float(info.get("marketCap")  or 0)
    pe_raw  = info.get("trailingPE")
    pe_ratio = round(float(pe_raw), 1) if pe_raw else None

    fcf = 0.0
    if cf_q is not None and not cf_q.empty:
        fcf = safe_val(cf_q[cf_q.columns[0]], "Free Cash Flow")

    # Revenue trend — last 4Q, oldest first
    trend = []
    for i, c in enumerate(cols[:4]):
        d = income_q[c]
        trend.append({
            "period":      quarter_label(c),
            "revenue":     safe_val(d, "Total Revenue"),
            "netIncome":   safe_val(d, "Net Income"),
            "grossProfit": safe_val(d, "Gross Profit"),
        })
    trend.reverse()

    # Margin trend — last 6Q, oldest first
    margin_trend = []
    for c in cols[:6]:
        d   = income_q[c]
        rev = safe_val(d, "Total Revenue")
        if rev <= 0:
            continue
        gp  = safe_val(d, "Gross Profit")
        oi  = safe_val(d, "Operating Income")
        if oi == 0:
            oi = safe_val(d, "EBIT")
        ni  = safe_val(d, "Net Income")
        margin_trend.append({
            "period":           quarter_label(c),
            "grossMargin":      round(gp / rev * 100, 1),
            "operatingMargin":  round(oi / rev * 100, 1),
            "netMargin":        round(ni / rev * 100, 1),
        })
    margin_trend.reverse()

    # Stock price history — weekly samples over 1 year
    stock_history = []
    current_price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
    try:
        hist = yf.Ticker(ticker_symbol).history(period="1y")
        print(f"[stock history] rows={len(hist)}, cols={list(hist.columns) if not hist.empty else []}")
        if not hist.empty:
            sampled = hist["Close"].iloc[::5]   # every ~5 trading days ≈ weekly
            for date, price in sampled.items():
                p = float(price)
                if p > 0 and p < 1_000_000:   # filter sentinel values
                    stock_history.append({
                        "date":  pd.Timestamp(date).strftime("%b '%y"),
                        "price": round(p, 2),
                    })
            print(f"[stock history] {len(stock_history)} points, first={stock_history[0] if stock_history else None}")
        else:
            print(f"[stock history] empty dataframe for {ticker_symbol}")
    except Exception as e:
        print(f"[stock history] ERROR: {e}")

    period_str = quarter_label(cols[0]) if cols else ""

    # CEO
    ceo = None
    for officer in info.get("companyOfficers", []):
        title = officer.get("title", "").upper()
        if "CEO" in title or "CHIEF EXECUTIVE" in title:
            ceo = officer.get("name")
            break

    # ── 4. Claude: financial highlights ─────────────────────────────────────
    trend_lines = "\n".join(
        f"  {q['period']}: Revenue {fmt(q['revenue'])}, Net Income {fmt(q['netIncome'])}"
        for q in trend
    )

    # QoQ change (latest vs previous quarter)
    prev_q_rev = safe_val(income_q[cols[1]], "Total Revenue") if len(cols) > 1 else 0
    prev_q_ni  = safe_val(income_q[cols[1]], "Net Income")    if len(cols) > 1 else 0
    qoq_rev    = yoy(revenue, prev_q_rev)
    qoq_ni     = yoy(net_income, prev_q_ni)

    claude_data = f"""Company: {info.get('longName', ticker_symbol)} ({ticker_symbol})
Sector: {info.get('sector','N/A')} | Industry: {info.get('industry','N/A')}
Latest Quarter: {period_str}

YEAR-OVER-YEAR (same quarter last year):
  Revenue:      {fmt(revenue)}    | YoY: {f'{revenue_yoy:+.1f}%' if revenue_yoy is not None else 'N/A'}
  Net Income:   {fmt(net_income)} | YoY: {f'{net_income_yoy:+.1f}%' if net_income_yoy is not None else 'N/A'}
  Gross Margin: {gross_margin:.1f}%
  Net Margin:   {net_margin:.1f}%
  Market Cap:   {fmt(mkt_cap)}
  P/E Ratio:    {f'{pe_ratio:.1f}×' if pe_ratio else 'N/A'}

VS. PREVIOUS QUARTER (explain seasonality if relevant — e.g. Q1 is always lower after holiday Q4):
  Revenue vs. last quarter:    {f'{qoq_rev:+.1f}%' if qoq_rev is not None else 'N/A'}
  Net Income vs. last quarter: {f'{qoq_ni:+.1f}%'  if qoq_ni  is not None else 'N/A'}

QUARTERLY TREND (oldest → newest):
{trend_lines}"""

    highlights = get_highlights(claude_data)

    # ── 5. SEC EDGAR: fetch 10-Q MD&A + deep insights ───────────────────────
    sec_insights = None
    try:
        mda_text = await fetch_10q_mda(ticker_symbol)
        if mda_text:
            company_full_name = info.get("longName") or info.get("shortName") or ticker_symbol
            sec_insights = get_sec_insights(mda_text, company_full_name)
    except Exception as e:
        print(f"[SEC insights] Skipping due to error: {e}")

    # ── 6. Return ────────────────────────────────────────────────────────────
    return {
        "company": {
            "name":        info.get("longName") or info.get("shortName"),
            "ticker":      ticker_symbol,
            "sector":      info.get("sector"),
            "industry":    info.get("industry"),
            "logo":        f"https://logo.clearbit.com/{domain}",
            "website":     info.get("website"),
            "ceo":         ceo,
            "employees":   info.get("fullTimeEmployees"),
            "exchange":    info.get("exchange"),
            "description": (info.get("longBusinessSummary") or "")[:300],
        },
        "metrics": {
            "revenue":        revenue,
            "revenue_yoy":    revenue_yoy,
            "net_income":     net_income,
            "net_income_yoy": net_income_yoy,
            "gross_margin":   gross_margin,
            "net_margin":     net_margin,
            "eps":            eps,
            "eps_yoy":        None,
            "free_cash_flow": fcf,
            "fcf_yoy":        None,
            "market_cap":     mkt_cap,
            "current_price":  current_price,
            "pe_ratio":       pe_ratio,
            "ebitda":         ebitda,
            "period":         period_str,
        },
        "revenue_trend":  trend,
        "margin_trend":   margin_trend,
        "stock_history":  stock_history,
        "highlights":     highlights,
        "sec_insights":   sec_insights,
    }
