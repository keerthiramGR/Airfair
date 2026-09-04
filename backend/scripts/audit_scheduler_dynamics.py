from datetime import datetime, date, timedelta, timezone
from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, CollectionRun, Route, Airline
from backend.jobs.daily_accumulation_scheduler import execute_daily_accumulation
from backend.ml.readiness_gate import MLReadinessGate
from backend.services.airfare_api_client import AirfareAPIClient
from backend.normalization.fare_normalizer import FareNormalizer
from backend.deduplication.fare_deduplicator import FareDeduplicator
from sqlalchemy import func

db = SessionLocal()

print("==================================================")
print("  AIRFAIR — PHASE 7 STEP 9: SCHEDULER AUDIT       ")
print("==================================================")

# 1. Audit Observation-Date Generation Logic
print("\n--- 1. AUDIT OBSERVATION-DATE GENERATION LOGIC ---")
today_date = date.today()
now_utc = datetime.now(timezone.utc)
print(f"System date.today(): {today_date}")
print(f"System datetime.now(timezone.utc): {now_utc.isoformat()}")

# Verify dynamic flight_date calculation for T+1, T+3, T+7, T+15, T+30, T+45
for win, days in [("T+1", 1), ("T+3", 3), ("T+7", 7), ("T+15", 15), ("T+30", 30), ("T+45", 45)]:
    calc_flt_date = today_date + timedelta(days=days)
    calc_win = FareNormalizer.calculate_advance_window(str(calc_flt_date), str(today_date))
    print(f"  Window {win} (+{days}d): Flight Date = {calc_flt_date} -> Normalized Window = {calc_win}")

# 2. Audit Deduplication and Intraday Price Changes Preservation
print("\n--- 2. AUDIT DEDUPLICATION & PROVENANCE PRESERVATION ---")
q1 = {
    "airline_code": "6E", "route_origin": "DEL", "route_destination": "BOM",
    "flight_date": str(today_date + timedelta(days=7)),
    "advance_purchase_window": "T+7", "fare_class": "ECONOMY",
    "source": "SERPAPI", "scraped_at": now_utc.isoformat(), "total_fare": 6500.0
}
# Identical scrape at same hour
q2 = {
    "airline_code": "6E", "route_origin": "DEL", "route_destination": "BOM",
    "flight_date": str(today_date + timedelta(days=7)),
    "advance_purchase_window": "T+7", "fare_class": "ECONOMY",
    "source": "SERPAPI", "scraped_at": now_utc.isoformat(), "total_fare": 6500.0
}
# Intraday fare shift (e.g. fare went up to 6850.0)
q3 = {
    "airline_code": "6E", "route_origin": "DEL", "route_destination": "BOM",
    "flight_date": str(today_date + timedelta(days=7)),
    "advance_purchase_window": "T+7", "fare_class": "ECONOMY",
    "source": "SERPAPI", "scraped_at": (now_utc + timedelta(hours=4)).isoformat(), "total_fare": 6850.0
}

unique_batch, dup_count = FareDeduplicator.filter_batch([q1, q2, q3])
print(f"Deduplication test: Input = 3 records -> Duplicates filtered = {dup_count}, Unique preserved = {len(unique_batch)}")
assert dup_count == 1, "Expected 1 duplicate filtered"
assert len(unique_batch) == 2, "Expected 2 distinct records preserved (including price shift)"
print("Deduplication logic successfully preserves legitimate price changes while eliminating identical duplicates.")

# 3. Audit Current Real Database Telemetry
print("\n--- 3. DATABASE TELEMETRY & ML READINESS GATE AUDIT ---")
real_count = db.query(func.count(FareQuote.id)).filter(FareQuote.source != 'MOCK').scalar()
total_count = db.query(func.count(FareQuote.id)).scalar()
coll_dates = db.query(func.date(FareQuote.scraped_at)).filter(FareQuote.source != 'MOCK').distinct().all()
coll_dates_list = sorted([str(d[0]) for d in coll_dates if d[0] is not None])

gate_report = MLReadinessGate.evaluate_gate(db)

print(f"Total Real Records in Supabase (source != 'MOCK'): {real_count}")
print(f"Total Records in fare_quotes: {total_count}")
print(f"Unique Collection Dates ({len(coll_dates_list)}): {coll_dates_list}")
print(f"Consecutive Collection Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"Flight Dates ({gate_report['unique_flight_dates_count']}): {gate_report['unique_flight_dates']}")
print(f"Route Distribution: {gate_report['route_distribution']}")
print(f"Airline Distribution: {gate_report['airline_distribution']}")
print(f"Lead-Time Distribution: {gate_report['advance_window_distribution']}")
print(f"Data Quality Score: {gate_report['data_quality_score']}")
print(f"Outliers: {gate_report['outlier_count']}")
print(f"Gate Status: {gate_report['gate_status']}")
print(f"Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"Blocking Reasons: {gate_report['blocking_reasons']}")

db.close()
