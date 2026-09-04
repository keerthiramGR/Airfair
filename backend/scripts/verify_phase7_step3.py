from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline
from backend.jobs.accumulation_job import AccumulationPipeline
from backend.monitoring.ml_telemetry import MLTelemetryService
from fastapi.testclient import TestClient
from backend.main import app

db = SessionLocal()
client = TestClient(app)

print("--- 1. INITIAL ML READINESS TELEMETRY ---")
initial_telemetry = MLTelemetryService.get_telemetry(db)
print(f"Total Real Observations: {initial_telemetry['total_real_observations']}")
print(f"Unique Collection Dates: {initial_telemetry['unique_collection_dates']}")
print(f"Unique Flight Dates: {initial_telemetry['unique_flight_dates']}")
print(f"Advance Windows: {initial_telemetry['advance_window_coverage']}")
print(f"Corridors Monitored: {initial_telemetry['route_coverage']}")

print("\n--- 2. EXECUTING SYSTEMATIC MULTI-WINDOW ACCUMULATION ---")
pipeline = AccumulationPipeline(db)
# Execute systematic collection for DEL-BOM across T+1 (tomorrow), T+7 (1 week), T+30 (1 month)
run_result = pipeline.execute_systematic_collection(
    corridors=[("DEL", "BOM")],
    windows=[("T+1", 1), ("T+7", 7), ("T+30", 30)],
    delay_between_requests=1.5
)
print(f"Accumulation Run Status: {run_result['status']}")
print(f"Total Collected: {run_result['total_collected']}")
print(f"Total Inserted: {run_result['total_inserted']}")
print(f"Quality Score: {run_result['data_quality_score']}")

print("\n--- 3. TEST GET /api/collection/ml-telemetry API ENDPOINT ---")
res_api = client.get("/api/collection/ml-telemetry")
print(f"API Status Code: {res_api.status_code}")
telemetry_data = res_api.json()
print("ML Telemetry Summary:")
print(f"  Readiness Status: {telemetry_data['readiness_status']}")
print(f"  Total Real Observations: {telemetry_data['total_real_observations']}")
print(f"  Unique Collection Dates ({telemetry_data['unique_collection_dates_count']}): {telemetry_data['unique_collection_dates']}")
print(f"  Unique Flight Dates ({telemetry_data['unique_flight_dates_count']}): {telemetry_data['unique_flight_dates']}")
print(f"  Corridors Covered: {telemetry_data['route_coverage']}")
print(f"  Airline Breakdown: {telemetry_data['airline_coverage']}")
print(f"  Advance Window Breakdown: {telemetry_data['advance_window_coverage']}")
print(f"  Per-Route Temporal Depth: {telemetry_data['per_route_temporal_depth']}")
print(f"  Training Prerequisites: {telemetry_data['training_prerequisites']}")

db.close()
