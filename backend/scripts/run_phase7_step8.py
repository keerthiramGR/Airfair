from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline
from backend.jobs.daily_accumulation_scheduler import execute_daily_accumulation
from backend.ml.readiness_gate import MLReadinessGate
from backend.ml.dataset_exporter import MLDatasetExporter
from sqlalchemy import func

db = SessionLocal()

print("==================================================")
print("     AIRFAIR — PHASE 7 STEP 8: REAL DATA          ")
print("        ACCUMULATION & READINESS EVALUATION       ")
print("==================================================")

# 1. Pre-Run Database Counts
prev_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
prev_total_count = db.query(func.count(FareQuote.id)).scalar()

print(f"\n--- 1. PRE-COLLECTION AUDIT ---")
print(f"Previous Real Records (source != 'MOCK'): {prev_real_count}")
print(f"Previous Total Records in fare_quotes: {prev_total_count}")

# 2. Execute Real SerpApi Accumulation Run
print(f"\n--- 2. EXECUTING REAL SERPAPI ACCUMULATION RUN ---")
corridors = [("DEL", "BOM"), ("MAA", "DEL"), ("DEL", "BLR"), ("BOM", "BLR"), ("DEL", "CCU"), ("DEL", "HYD")]
windows = [("T+1", 1), ("T+7", 7), ("T+15", 15), ("T+30", 30), ("T+45", 45)]

run_res = execute_daily_accumulation(corridors=corridors, windows=windows, delay=1.5)

# 3. Post-Run Database Audit
cur_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
cur_total_count = db.query(func.count(FareQuote.id)).scalar()
new_real_records = cur_real_count - prev_real_count

print(f"\n--- 3. POST-COLLECTION DATABASE AUDIT ---")
print(f"Collection Status: {run_res.get('status')}")
print(f"Total Quotes Scraped from SerpApi: {run_res.get('total_collected')}")
print(f"Newly Inserted Real Records: {new_real_records}")
print(f"Current Real Records in Supabase (source != 'MOCK'): {cur_real_count}")
print(f"Current Total Records in fare_quotes: {cur_total_count}")

# 4. Strict ML Readiness Gate Evaluation
print(f"\n--- 4. STRICT ML READINESS GATE EVALUATION ---")
gate_report = MLReadinessGate.evaluate_gate(db)

print(f"Gate Status: {gate_report['gate_status']}")
print(f"Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"Blocking Reasons: {gate_report['blocking_reasons']}")
print(f"Progress Percentage: {gate_report['progress_percentage']}%")
print(f"Collection Dates ({gate_report['unique_collection_dates_count']}): {gate_report['unique_collection_dates']}")
print(f"Consecutive Collection Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"Flight Travel Dates ({gate_report['unique_flight_dates_count']}): {gate_report['unique_flight_dates']}")
print(f"Missing Collection Dates: {gate_report['missing_collection_dates']}")
print(f"Route Distribution: {gate_report['route_distribution']}")
print(f"Airline Distribution: {gate_report['airline_distribution']}")
print(f"Lead-Time Window Distribution: {gate_report['advance_window_distribution']}")
print(f"Outliers: {gate_report['outlier_count']}")
print(f"Data Quality Score: {gate_report['data_quality_score']}")
print(f"Temporal Span per Route: {gate_report['temporal_span_per_route']}")
print(f"Gate Thresholds: {gate_report['gate_thresholds']}")

# 5. Export Updated ML Dataset CSV & Metadata
print(f"\n--- 5. UPDATING OFFLINE ML DATASET CSV & METADATA ---")
exporter = MLDatasetExporter(db)
exporter.prepare_and_export()
print("ML dataset CSV and metadata successfully synchronized.")

db.close()
