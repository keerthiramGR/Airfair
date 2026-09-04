from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline
from backend.ml.readiness_gate import MLReadinessGate
from backend.ml.dataset_builder import MLDatasetBuilder
from backend.ml.feature_engineering import MLFeatureEngineer
from backend.ml.dataset_exporter import MLDatasetExporter
from sqlalchemy import func
import json

db = SessionLocal()

print("==================================================")
print("     AIRFAIR — PHASE 8 STEP 1: PRE-TRAINING       ")
print("          ML READINESS VERIFICATION AUDIT         ")
print("==================================================")

# 1. Real records and ML-Eligible count
real_quotes = (
    db.query(FareQuote, Route, Airline)
    .join(Route, FareQuote.route_id == Route.id)
    .join(Airline, FareQuote.airline_id == Airline.id)
    .filter(FareQuote.source != 'MOCK')
    .order_by(FareQuote.scraped_at.asc(), FareQuote.id.asc())
    .all()
)
total_real_in_db = len(real_quotes)

builder = MLDatasetBuilder(db)
eligible_records, extraction_audit = builder.extract_real_observations()

# 2. Feature Engineering & Leakage Audit
engineer = MLFeatureEngineer(db)
features = engineer.engineer_features(eligible_records)

exporter = MLDatasetExporter(db)
leakage_checks = exporter._verify_data_leakage(features)
_, split_summary = exporter._partition_dataset(features)

# 3. Gate Evaluation
gate_report = MLReadinessGate.evaluate_gate(db)

print(f"\n1. Real-Record Count in DB: {total_real_in_db}")
print(f"2. ML-Eligible Records Extracted: {len(eligible_records)}")
print(f"3. Excluded Records: {extraction_audit['excluded_records_count']}")
print(f"4. Unique Collection Dates ({gate_report['unique_collection_dates_count']}): {gate_report['unique_collection_dates']}")
print(f"5. Consecutive Collection Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"6. Unique Flight Dates ({gate_report['unique_flight_dates_count']}): {gate_report['unique_flight_dates']}")
print(f"7. Route Distribution: {gate_report['route_distribution']}")
print(f"8. Route Temporal Depth: {gate_report['temporal_span_per_route']}")
print(f"9. Airline Distribution: {gate_report['airline_distribution']}")
print(f"10. Lead-Time Window Distribution: {gate_report['advance_window_distribution']}")
print(f"11. Missing Collection Dates: {gate_report['missing_collection_dates']}")
print(f"12. Feature Count & Sample: {len(features[0].keys()) if features else 0} features")
print(f"13. Data Leakage Audit: {leakage_checks}")
print(f"14. Chronological Split Status: {split_summary}")
print(f"15. MLReadinessGate Status: {gate_report['gate_status']}")
print(f"16. Gate Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"17. Blocking Reasons: {gate_report['blocking_reasons']}")

db.close()
