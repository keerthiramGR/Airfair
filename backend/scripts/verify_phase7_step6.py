from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline
from backend.jobs.daily_accumulation_scheduler import execute_daily_accumulation
from backend.ml.readiness_gate import MLReadinessGate
from sqlalchemy import func

db = SessionLocal()

print("==================================================")
print("     PHASE 7 STEP 6: REAL DATA ACCUMULATION &     ")
print("               ML READINESS GATE                  ")
print("==================================================")

# 1. Previous Real Record Count
prev_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
prev_total_count = db.query(func.count(FareQuote.id)).scalar()
print(f"\n1. PREVIOUS REAL RECORD COUNT (source != 'MOCK'): {prev_real_count}")
print(f"   Previous Total Record Count in fare_quotes: {prev_total_count}")

# 2. Execute Real SerpApi Accumulation Run
print("\n2. EXECUTING REAL SERPAPI ACCUMULATION RUN...")
corridors = [("DEL", "BOM"), ("MAA", "DEL"), ("DEL", "BLR"), ("BOM", "BLR")]
windows = [("T+1", 1), ("T+7", 7), ("T+15", 15), ("T+30", 30), ("T+45", 45)]

run_res = execute_daily_accumulation(corridors=corridors, windows=windows, delay=1.5)

# 3. Post-Accumulation Database Count
cur_real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
cur_total_count = db.query(func.count(FareQuote.id)).scalar()
new_real_records = cur_real_count - prev_real_count

print(f"\n3. POST-ACCUMULATION DATABASE AUDIT:")
print(f"   Newly Collected Real Records Inserted: {new_real_records}")
print(f"   Current Real Record Count (source != 'MOCK'): {cur_real_count}")
print(f"   Current Total Records in fare_quotes: {cur_total_count}")

# 4. Strict ML Readiness Gate Evaluation
print("\n4. EVALUATING STRICT ML READINESS GATE...")
gate_report = MLReadinessGate.evaluate_gate(db)

print(f"   Gate Status: {gate_report['gate_status']}")
print(f"   Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"   Dataset Progress: {gate_report['progress_percentage']}%")
print(f"   Unique Collection Dates ({gate_report['unique_collection_dates_count']}): {gate_report['unique_collection_dates']}")
print(f"   Consecutive Collection Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"   Unique Flight Dates ({gate_report['unique_flight_dates_count']}): {gate_report['unique_flight_dates']}")
print(f"   Route Distribution: {gate_report['route_distribution']}")
print(f"   Airline Distribution: {gate_report['airline_distribution']}")
print(f"   Lead-Time Window Distribution: {gate_report['advance_window_distribution']}")
print(f"   Outliers Count: {gate_report['outlier_count']}")
print(f"   Data Quality Score: {gate_report['data_quality_score']}")
print(f"   Missing Collection Dates: {gate_report['missing_collection_dates']}")
print(f"   Temporal Span per Route: {gate_report['temporal_span_per_route']}")
print(f"   Gate Thresholds: {gate_report['gate_thresholds']}")

db.close()
