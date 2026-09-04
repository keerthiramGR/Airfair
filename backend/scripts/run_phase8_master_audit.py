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
print("     AIRFAIR — PHASE 8 MASTER TASK AUDIT          ")
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

# 2. Extract ML-Eligible Records & Features
builder = MLDatasetBuilder(db)
eligible_records, extraction_audit = builder.extract_real_observations()

exporter = MLDatasetExporter(db)
metadata = exporter.prepare_and_export()

# 3. CSV File Audit
csv_path = Path("backend/ml/data/airfare_ml_dataset.csv")
with open(csv_path, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    csv_rows = list(reader)

# 4. Gate Evaluation
gate_report = MLReadinessGate.evaluate_gate(db)

print(f"Total fare_quotes: {total_fare_quotes}")
print(f"Real records (source != 'MOCK'): {total_real}")
print(f"ML-eligible records: {len(eligible_records)}")
print(f"Unique Collection Dates: {gate_report['unique_collection_dates']}")
print(f"Consecutive Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"Flight Dates ({gate_report['unique_flight_dates_count']}): {gate_report['unique_flight_dates']}")
print(f"Route Distribution: {gate_report['route_distribution']}")
print(f"Route Temporal Depth: {gate_report['temporal_span_per_route']}")
print(f"Airline Distribution: {gate_report['airline_distribution']}")
print(f"Lead-Time Distribution: {gate_report['advance_window_distribution']}")
print(f"Missing Dates: {gate_report['missing_collection_dates']}")
print(f"Data Quality Score: {gate_report['data_quality_score']}")
print(f"Outlier Count: {gate_report['outlier_count']}")
print(f"CSV Rows: {len(csv_rows)}, Columns: {len(reader.fieldnames) if reader.fieldnames else 0}")
print(f"Leakage Checks: {metadata['leakage_checks']}")
print(f"Split Summary: {metadata['dataset_split_summary']}")
print(f"Gate Status: {gate_report['gate_status']}")
print(f"Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"Blocking Reasons: {gate_report['blocking_reasons']}")

db.close()
