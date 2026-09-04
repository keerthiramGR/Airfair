# AIRFAIR — Real-Time Airfare Price Index for India
### Smart India Hackathon 2026 • Problem Statement 26056

AIRFAIR is an institutional-grade airfare price indexing platform that collects domestic airfare data, cleans and normalizes it, calculates composite price movement indexes, and serves analytics via Next.js, FastAPI, and Supabase PostgreSQL.

---

## Real Airfare API Integration (Phase 4)

AIRFAIR connects to legitimate commercial flight search APIs to ingest real airfare quotes into the Supabase database. Supported providers include:
- **SerpApi Google Flights** (Default, `AIRFARE_API_PROVIDER=SERPAPI`)
- **Kiwi Tequila API** (`AIRFARE_API_PROVIDER=KIWI`)
- **RapidAPI Skyscanner** (`AIRFARE_API_PROVIDER=SKYSCANNER`)

---

### 1. How to Obtain the API Key
1. **SerpApi (Google Flights)**:
   - Register at [serpapi.com](https://serpapi.com).
   - Navigate to your dashboard and copy your private API Key.
2. **Kiwi Tequila**:
   - Register at [tequila.kiwi.com](https://tequila.kiwi.com).
   - Create a search application and obtain the API key.
3. **RapidAPI Skyscanner**:
   - Register at [rapidapi.com](https://rapidapi.com).
   - Subscribe to Skyscanner Flight Search API and obtain your RapidAPI key.

---

### 2. Where to Place the API Key
Add your key to `backend/.env` (and ensure it is never committed to Git):

```env
# Real Airfare Data API Integration
AIRFARE_API_KEY=your_actual_api_key_here
AIRFARE_API_PROVIDER=SERPAPI
AIRFARE_API_BASE_URL=https://serpapi.com/search.json
AIRFARE_API_ENABLED=true
DATA_SOURCE_MODE=REAL
TEST_MODE=false
```

---

### 3. Required Environment Variables
| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | *Supabase Connection String* | PostgreSQL connection pooler URI |
| `AIRFARE_API_KEY` | *(empty)* | Private API secret from provider |
| `AIRFARE_API_PROVIDER` | `SERPAPI` | `SERPAPI`, `KIWI`, or `SKYSCANNER` |
| `AIRFARE_API_BASE_URL` | `https://serpapi.com/search.json` | Provider REST endpoint |
| `AIRFARE_API_ENABLED` | `true` | Toggle API integration on or off |
| `DATA_SOURCE_MODE` | `REAL` | `REAL` for live API queries, `MOCK` for offline |
| `TEST_MODE` | `false` | `true` enables offline calibration fallback |

---

### 4. How to Start FastAPI & Next.js
1. **Start Backend**:
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Start Frontend**:
   ```bash
   npm run dev
   ```

---

### 5. How to Run a Real Airfare Collection
Trigger collection via REST:
```bash
curl -X POST http://localhost:8000/api/collection/run \
  -H "Content-Type: application/json" \
  -d '{"origin": "DEL", "destination": "BOM", "flight_date": "2026-09-15", "sources": ["AIRLINE"]}'
```

---

### 6. How to Verify Supabase
1. Check collection status:
   ```bash
   curl http://localhost:8000/api/collection/status
   ```
2. Inspect live quotes in Supabase PostgreSQL:
   ```bash
   curl "http://localhost:8000/api/fares?origin=DEL&destination=BOM&limit=5"
   ```
   Verify that records have `source: "SERPAPI"` (or configured provider) and valid `total_fare` math.

---

### 7. How to Enable TEST_MODE
To safely test the entire pipeline offline without making external HTTP requests or spending API quota:
```env
TEST_MODE=true
DATA_SOURCE_MODE=MOCK
```
When `TEST_MODE=true`, `MockCollector` generates calibrated test records with `source: "MOCK"`.

---

### 8. API Provider Limitations & Rate Limits
- **Rate Pacing**: The collector paces requests at 1.0–2.0 second intervals to prevent triggering rate limits.
- **Provider Quotas**:
  - SerpApi free tier provides 100 monthly searches.
  - Kiwi Tequila has rate limit tiering per account level.
  - RapidAPI imposes hourly request thresholds.
- **Security**: The API key is stored exclusively on the server and is never sent to the client browser or exposed in frontend code.
