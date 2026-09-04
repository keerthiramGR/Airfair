from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline
from backend.ml.readiness_gate import MLReadinessGate
from backend.ml.dataset_builder import MLDatasetBuilder
from backend.ml.feature_engineering import MLFeatureEngineer
from backend.ml.dataset_exporter import MLDatasetExporter
from sqlalchemy import func

db = SessionLocal()

print("==================================================")
print("     AIRFAIR — FINAL ML TRAINING READINESS        ")
print("                  DECISION GATE                   ")
print("==================================================")

real_quotes = (
    db.query(FareQuote, Route, Airline)
    .join(Route, FareQuote.route_id == Route.id)
    .join(Airline, FareQuote.airline_id == Airline.id)
    .filter(FareQuote.source != 'MOCK')
    .order_by(FareQuote.scraped_at.asc(), FareQuote.id.asc())
    .all()
)
total_real = len(real_quotes)

builder = MLDatasetBuilder(db)
eligible_records, extraction_audit = builder.extract_real_observations()

engineer = MLFeatureEngineer(db)
features = engineer.engineer_features(eligible_records)

exporter = MLDatasetExporter(db)
leakage_checks = exporter._verify_data_leakage(features)
_, split_summary = exporter._partition_dataset(features)

gate_report = MLReadinessGate.evaluate_gate(db)

print(f"Total Real Records in DB: {total_real}")
print(f"ML-Eligible Records: {len(eligible_records)}")
print(f"Excluded Records: {extraction_audit['excluded_records_count']}")
print(f"Unique Collection Dates ({gate_report['unique_collection_dates_count']}): {gate_report['unique_collection_dates']}")
print(f"Consecutive Streak: {gate_report['consecutive_collection_streak_days']} day(s)")
print(f"Flight Dates: {gate_report['unique_flight_dates_count']}")
print(f"Route Distribution: {gate_report['route_distribution']}")
print(f"Temporal Span per Route: {gate_report['temporal_span_per_route']}")
print(f"Airline Distribution: {gate_report['airline_distribution']}")
print(f"Lead-Time Distribution: {gate_report['advance_window_distribution']}")
print(f"Data Quality Score: {gate_report['data_quality_score']}")
print(f"Outlier Count: {gate_report['outlier_count']}")
print(f"Leakage Checks: {leakage_checks}")
print(f"Chronological Split: {split_summary}")
print(f"Gate Status: {gate_report['gate_status']}")
print(f"Readiness Explanation: {gate_report['readiness_explanation']}")
print(f"Blocking Reasons: {gate_report['blocking_reasons']}")

db.close()
