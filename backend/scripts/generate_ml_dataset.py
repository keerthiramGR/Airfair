from backend.database.connection import SessionLocal
from backend.ml.dataset_exporter import MLDatasetExporter
import json

print("==================================================")
print("     PHASE 7 STEP 5: ML DATASET GENERATION        ")
print("==================================================")

db = SessionLocal()
try:
    exporter = MLDatasetExporter(db)
    metadata = exporter.prepare_and_export()

    print("\n--- ML DATASET METADATA SUMMARY ---")
    print(f"Dataset Output File: {metadata.get('dataset_filepath')}")
    print(f"Raw Real Records in DB: {metadata.get('raw_real_records_in_db')}")
    print(f"ML-Eligible Records Extracted: {metadata.get('eligible_records_count')}")
    print(f"Records Excluded: {metadata.get('excluded_records_count')}")
    print(f"Features Engineered ({metadata.get('features_created_count')}): {metadata.get('feature_names')}")
    print(f"Routes Covered ({metadata.get('unique_routes_count')}): {metadata.get('unique_routes')}")
    print(f"Airlines Covered ({metadata.get('unique_airlines_count')}): {metadata.get('unique_airlines')}")
    print(f"Temporal Range: {metadata.get('temporal_range')}")
    print(f"Observations per Route: {metadata.get('observations_per_route')}")
    print(f"Observations per Airline: {metadata.get('observations_per_airline')}")
    print(f"Advance-Window Distribution: {metadata.get('advance_window_distribution')}")
    print(f"Outlier Count: {metadata.get('outlier_count')}")
    print(f"Data Leakage Verification: {metadata.get('leakage_checks')}")
    print(f"Dataset Split Summary: {metadata.get('dataset_split_summary')}")
    print(f"ML Dataset Readiness Status: {metadata.get('ml_dataset_readiness_status')}")

finally:
    db.close()
