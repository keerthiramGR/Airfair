from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline, FareDailySummary, AirfarePriceIndex
from sqlalchemy import func

db = SessionLocal()

print("--- AUDIT REAL DATA FOR ML DATASET PREPARATION ---")
real_quotes = (
    db.query(FareQuote, Route, Airline)
    .join(Route, FareQuote.route_id == Route.id)
    .join(Airline, FareQuote.airline_id == Airline.id)
    .filter(FareQuote.source != 'MOCK')
    .order_by(FareQuote.scraped_at.asc(), FareQuote.id.asc())
    .all()
)

print(f"Total Real Quotes in Supabase (source != 'MOCK'): {len(real_quotes)}")

dates = sorted(list(set(str(q.scraped_at.date()) for q, _, _ in real_quotes if q.scraped_at)))
flight_dates = sorted(list(set(str(q.flight_date) for q, _, _ in real_quotes if q.flight_date)))
corridors = sorted(list(set(f"{r.origin}-{r.destination}" for _, r, _ in real_quotes)))
airlines = sorted(list(set(f"{a.code} ({a.name})" for _, _, a in real_quotes)))
windows = sorted(list(set(str(q.advance_purchase_window) for q, _, _ in real_quotes)))

print(f"Unique Collection Dates ({len(dates)}): {dates}")
print(f"Unique Flight Dates ({len(flight_dates)}): {flight_dates}")
print(f"Corridors ({len(corridors)}): {corridors}")
print(f"Airlines ({len(airlines)}): {airlines}")
print(f"Advance Windows ({len(windows)}): {windows}")

# Check FareDailySummary and AirfarePriceIndex counts
summary_count = db.query(func.count(FareDailySummary.id)).scalar()
index_count = db.query(func.count(AirfarePriceIndex.id)).scalar()
print(f"FareDailySummary records: {summary_count}")
print(f"AirfarePriceIndex records: {index_count}")

db.close()
