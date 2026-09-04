from backend.database.connection import get_engine, SessionLocal
from backend.database.models import FareDailySummary, FareQuote, Route, Airline
from sqlalchemy import text
from fastapi.testclient import TestClient
from backend.main import app

db = SessionLocal()
client = TestClient(app)

print("--- 1. AUDIT FARE_DAILY_SUMMARY TABLE IN SUPABASE ---")
summaries = db.query(FareDailySummary).all()
print(f"Total Daily Summaries in Supabase: {len(summaries)}")

for s in summaries[:5]:
    rte = db.query(Route).filter(Route.id == s.route_id).first()
    air = db.query(Airline).filter(Airline.id == s.airline_id).first() if s.airline_id else None
    print(f"  Summary ID {s.id}: Route {rte.origin if rte else 'N/A'}-{rte.destination if rte else 'N/A'}, Airline {air.code if air else 'ALL'}, "
          f"FlightDate: {s.flight_date}, ObsDate: {s.observation_date}, Min: INR {s.min_fare}, Avg: INR {s.average_fare}, "
          f"Max: INR {s.max_fare}, Median: INR {s.median_fare}, Count: {s.observation_count}, Trend: {s.trend}, Score: {s.quality_score}")


print("\n--- 2. TEST HISTORICAL API: DEL -> BOM ---")
res_del_bom = client.get("/api/historical/fares?origin=DEL&destination=BOM&days=30")
print(f"Status Code: {res_del_bom.status_code}")
data_del_bom = res_del_bom.json()
print("DEL-BOM Response:", data_del_bom)

print("\n--- 3. TEST HISTORICAL API: MAA -> DEL ---")
res_maa_del = client.get("/api/historical/fares?origin=MAA&destination=DEL&days=30")
print(f"Status Code: {res_maa_del.status_code}")
data_maa_del = res_maa_del.json()
print("MAA-DEL Response:", data_maa_del)

print("\n--- 4. TEST DATA QUALITY API: GET /api/data-quality/status ---")
res_dq = client.get("/api/data-quality/status")
print(f"Status Code: {res_dq.status_code}")
data_dq = res_dq.json()
print("Data Quality Response:", data_dq)

db.close()
