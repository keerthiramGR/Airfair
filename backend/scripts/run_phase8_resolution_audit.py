from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline, CollectionRun
from backend.ml.readiness_gate import MLReadinessGate
from backend.ml.dataset_builder import MLDatasetBuilder
from backend.ml.feature_engineering import MLFeatureEngineer
from backend.ml.dataset_exporter import MLDatasetExporter
from sqlalchemy import func
import csv
from pathlib import Path

db = SessionLocal()

print("==================================================")
print("  AIRFAIR — PHASE 8: COMPREHENSIVE ACCUMULATION   ")
print("          & ML READINESS RESOLUTION AUDIT         ")
print("==================================================")

# 1. Database Counts
real_quotes = (
    db.query(FareQuote, Route, Airline)
    .join(Route, FareQuote.route_id == Route.id)
    .join(Airline, FareQuote.airline_id == Airline.id)
    .filter(FareQuote.source != 'MOCK')
    .order_by(FareQuote.scraped_at.asc(), FareQuote.id.asc())
    .all()
)
total_real = len(real_quotes)
total_fare_quotes = db.query(func.count(FareQuote.id)).scalar()
total_runs = db.query(func.count(CollectionRun.id)).scalar()

# 2. Extract ML-Eligible Records
builder = MLDatasetBuilder(db)
eligible_records, extraction_audit = builder.extract_real_observations()

# 3. Feature Engineering & Dataset Export
exporter = MLDatasetExporter(db)
metadata = exporter.prepare_and_export()

# 4. Verify Exported CSV
csv_path = Path("backend/ml/data/airfare_ml_dataset.csv")
with open(csv_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    csv_rows = list(reader)

# 5. Evaluate ML Readiness Gate
gate_report = MLReadinessGate.evaluate_gate(db)

print(f"\n1. Database Telemetry:")
print(f"   Total fare_quotes in Supabase: {total_fare_quotes}")
print(f"   Real records (source != 'MOCK'): {total_real}")
print(f"   ML-Eligible records extracted: {len(eligible_records)}")
print(f"   Records excluded: {extraction_audit['excluded_records_count']}")
print(f"   Collection runs logged: {total_runs}")

print(f"\n2. Temporal Coverage:")
print(f"   Unique Collection Dates ({gate_report['unique_collection_dates_count']}): {gate_report['unique_collection_dates']}")
print(f"   Consecutive Collection Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"   Unique Flight Travel Dates ({gate_report['unique_flight_dates_count']}): {gate_report['unique_flight_dates']}")
print(f"   Missing Collection Dates: {gate_report['missing_collection_dates']}")

print(f"\n3. Spatial & Route Distribution:")
print(f"   Routes Monitored: {gate_report['route_distribution']}")
print(f"   Route Temporal Depth: {gate_report['temporal_span_per_route']}")

print(f"\n4. Airline & Lead-Time Coverage:")
print(f"   Airline Distribution: {gate_report['airline_distribution']}")
print(f"   Lead-Time Distribution: {gate_report['advance_window_distribution']}")

print(f"\n5. Data Quality & Outliers:")
print(f"   Quality Score: {gate_report['data_quality_score']} / 100")
print(f"   Outliers Flagged: {gate_report['outlier_count']}")

print(f"\n6. 33-Feature Dataset CSV Validation:")
print(f"   CSV File: {csv_path}")
print(f"   CSV Row Count: {len(csv_rows)}")
print(f"   CSV Column Count: {len(reader.fieldnames) if reader.fieldnames else 0}")
print(f"   Columns: {reader.fieldnames}")

print(f"\n7. Data Leakage & Split Audit:")
print(f"   Leakage Audit: {metadata['leakage_checks']}")
print(f"   Split Summary: {metadata['dataset_split_summary']}")

print(f"\n8. ML Readiness Gate Result:")
print(f"   Gate Status: {gate_report['gate_status']}")
print(f"   Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"   Blocking Reasons: {gate_report['blocking_reasons']}")
print(f"   Temporal Progress toward 30 Days: {gate_report['progress_percentage']}%")

db.close()
