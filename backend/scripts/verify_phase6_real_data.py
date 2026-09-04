from backend.database.connection import SessionLocal
from backend.database.models import AirfarePriceIndex, Route, Airline
from fastapi.testclient import TestClient
from backend.main import app

db = SessionLocal()
client = TestClient(app)

print("--- 1. AUDIT AIRFARE_PRICE_INDEX TABLE IN SUPABASE ---")
records = db.query(AirfarePriceIndex).all()
print(f"Total Airfare Price Index Records in Supabase: {len(records)}")

for r in records[:6]:
    rte = db.query(Route).filter(Route.id == r.route_id).first()
    air = db.query(Airline).filter(Airline.id == r.airline_id).first() if r.airline_id else None
    print(f"  Index ID {r.id}: Corridor {rte.origin if rte else 'N/A'}->{rte.destination if rte else 'N/A'}, "
          f"Carrier {air.code if air else 'ALL'}, Date: {r.observation_date}, Base: INR {r.baseline_fare}, "
          f"Current: INR {r.current_fare}, Index: {r.index_value}, Change: {r.percentage_change}%, "
          f"Movement: {r.movement}, Band: {r.price_band}, Rel: {r.reliability}")

print("\n--- 2. TEST GET /api/index?origin=DEL&destination=BOM&days=30 ---")
res_del_bom = client.get("/api/index?origin=DEL&destination=BOM&days=30")
print(f"Status Code: {res_del_bom.status_code}")
data_del_bom = res_del_bom.json()
print("DEL-BOM Index Summary:", data_del_bom)

print("\n--- 3. TEST GET /api/index/history?origin=DEL&destination=BOM&days=30 ---")
res_hist_del_bom = client.get("/api/index/history?origin=DEL&destination=BOM&days=30")
print(f"Status Code: {res_hist_del_bom.status_code}")
data_hist = res_hist_del_bom.json()
print(f"History Points: {len(data_hist)}, Sample First & Last:")
if data_hist:
    print("  First:", data_hist[0])
    print("  Last:", data_hist[-1])

print("\n--- 4. TEST GET /api/index?origin=MAA&destination=DEL&days=30 ---")
res_maa_del = client.get("/api/index?origin=MAA&destination=DEL&days=30")
print(f"Status Code: {res_maa_del.status_code}")
data_maa_del = res_maa_del.json()
print("MAA-DEL Index Summary:", data_maa_del)

db.close()
