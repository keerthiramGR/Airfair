from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, CollectionRun, Route, Airline
from backend.jobs.daily_accumulation_scheduler import execute_daily_accumulation
from backend.monitoring.ml_telemetry import MLReadinessService
from sqlalchemy import func
from fastapi.testclient import TestClient
from backend.main import app

db = SessionLocal()
client = TestClient(app)

print("==================================================")
print("     PHASE 7 STEP 4: REAL-DATA VERIFICATION       ")
print("==================================================")

# 1. Pre-execution count
prev_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
prev_total_count = db.query(func.count(FareQuote.id)).scalar()
print(f"1. PREVIOUS REAL RECORD COUNT: {prev_real_count}")
print(f"   Previous Total Record Count: {prev_total_count}")

# 2. Execute Real Collection via Daily Scheduler (multi-window T+1, T+3, T+7, T+15, T+30, T+45)
print("\n2. EXECUTING REPEATABLE DAILY ACCUMULATION PIPELINE (SERPAPI)...")
corridors = [("DEL", "BOM"), ("MAA", "DEL")]
windows = [("T+1", 1), ("T+3", 3), ("T+7", 7), ("T+15", 15), ("T+30", 30), ("T+45", 45)]

run_res = execute_daily_accumulation(corridors=corridors, windows=windows, delay=1.5)

# 3. Post-execution count in Supabase
cur_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
cur_total_count = db.query(func.count(FareQuote.id)).scalar()
new_real_records = cur_real_count - prev_real_count

print(f"\n3. POST-EXECUTION DATABASE AUDIT:")
print(f"   Newly Collected Real Records Inserted: {new_real_records}")
print(f"   Current Real Record Count (source != 'MOCK'): {cur_real_count}")
print(f"   Current Total Records in fare_quotes: {cur_total_count}")

# 4. Verify ML Readiness API
print("\n4. QUERYING GET /api/collection/ml-readiness API...")
res_api = client.get("/api/collection/ml-readiness")
readiness_data = res_api.json()

print(f"   Status Code: {res_api.status_code}")
print(f"   Overall Readiness Status: {readiness_data['overall_readiness_status']}")
print(f"   Dataset Progress: {readiness_data['dataset_progress_percentage']}%")
print(f"   Unique Collection Dates ({readiness_data['unique_collection_dates_count']}): {readiness_data['unique_collection_dates']}")
print(f"   Unique Flight Travel Dates ({readiness_data['unique_flight_dates_count']}): {readiness_data['unique_flight_dates']}")
print(f"   Corridors Covered: {readiness_data['route_coverage']}")
print(f"   Airlines Covered: {list(readiness_data['airline_coverage'].keys())}")
print(f"   Advance Window Distribution: {readiness_data['advance_window_coverage']}")
print(f"   Per-Route Temporal Depth: {readiness_data['per_route_readiness']}")
print(f"   Outliers Flagged: {readiness_data['outliers_count']}")
print(f"   Data Quality Score: {readiness_data['data_quality_score']}")

# 5. Check newest inserted records in Supabase
latest_real = (
    db.query(FareQuote, Route, Airline)
    .join(Route, FareQuote.route_id == Route.id)
    .join(Airline, FareQuote.airline_id == Airline.id)
    .filter(FareQuote.source == 'SERPAPI')
    .order_by(FareQuote.id.desc())
    .limit(6)
    .all()
)
print("\n5. SAMPLE VERIFIED REAL RECORDS IN SUPABASE (source=SERPAPI):")
for q, r, a in latest_real:
    print(f"   ID {q.id}: [{a.code}] {a.name} | {r.origin}->{r.destination} | Flight: {q.flight_date} | "
          f"Window: {q.advance_purchase_window} | Fare: INR {q.total_fare} | Source: {q.source}")

db.close()
