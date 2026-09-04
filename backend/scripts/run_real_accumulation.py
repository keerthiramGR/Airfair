from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, CollectionRun, Route, Airline
from backend.jobs.accumulation_job import AccumulationPipeline
from sqlalchemy import func

db = SessionLocal()

print("--- 1. PRE-ACCUMULATION AUDIT ---")
initial_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
initial_total_count = db.query(func.count(FareQuote.id)).scalar()
print(f"Initial Real Records (source != 'MOCK'): {initial_real_count}")
print(f"Initial Total Records in fare_quotes: {initial_total_count}")

print("\n--- 2. EXECUTING REAL SERPAPI ACCUMULATION PIPELINE ---")
pipeline = AccumulationPipeline(db)

# Execute real collection for DEL -> BOM and MAA -> DEL
corridors = [("DEL", "BOM"), ("MAA", "DEL")]
result = pipeline.execute_batch(corridors=corridors, delay_between_requests=1.5)

print("\n--- 3. ACCUMULATION RESULT ---")
print(f"Status: {result.get('status')}")
print(f"Total Collected: {result.get('total_collected')}")
print(f"Total Inserted: {result.get('total_inserted')}")
print(f"Quality Score: {result.get('data_quality_score')}")
print("Corridor Results:")
for cr in result.get("corridor_results", []):
    print(f"  - {cr.get('route')} ({cr.get('advance_window')} / {cr.get('flight_date')}): "
          f"Collected: {cr.get('records_collected')}, Inserted: {cr.get('records_inserted')}, Status: {cr.get('status')}")

print("\n--- 4. POST-ACCUMULATION AUDIT IN SUPABASE ---")
final_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
final_total_count = db.query(func.count(FareQuote.id)).scalar()
new_real_records = final_real_count - initial_real_count

print(f"Final Real Records in Supabase: {final_real_count}")
print(f"Final Total Records in fare_quotes: {final_total_count}")
print(f"NEWLY COLLECTED REAL RECORDS INSERTED: {new_real_records}")

# Inspect latest inserted real quotes
latest_real_quotes = (
    db.query(FareQuote, Route, Airline)
    .join(Route, FareQuote.route_id == Route.id)
    .join(Airline, FareQuote.airline_id == Airline.id)
    .filter(FareQuote.source != 'MOCK')
    .order_by(FareQuote.id.desc())
    .limit(8)
    .all()
)

print("\n--- 5. LATEST REAL QUOTES IN SUPABASE ---")
for q, r, a in latest_real_quotes:
    print(f"  ID {q.id}: [{a.code}] {a.name} | {r.origin} -> {r.destination} | Flight: {q.flight_date} | "
          f"Window: {q.advance_purchase_window} | Total: INR {q.total_fare} | Source: {q.source} | "
          f"Scraped At: {q.scraped_at}")

# Check latest collection_runs
latest_runs = db.query(CollectionRun).order_by(CollectionRun.id.desc()).limit(4).all()
print("\n--- 6. LATEST COLLECTION RUNS IN SUPABASE ---")
for run in latest_runs:
    print(f"  Run ID {run.id}: Route {run.origin}->{run.destination} | Source: {run.source} | "
          f"Status: {run.status} | Collected: {run.records_collected} | Inserted: {run.records_inserted} | "
          f"Started: {run.started_at} | Completed: {run.completed_at}")

db.close()
