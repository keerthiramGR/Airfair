from backend.database.connection import get_engine
from sqlalchemy import text

eng = get_engine()
print("Engine:", eng)
if eng:
    with eng.connect() as conn:
        tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
        print("Tables:", [t[0] for t in tables])
        for t in ['fare_quotes', 'collection_runs', 'airlines', 'routes', 'airfare_index', 'price_forecasts', 'alerts', 'data_sources']:
            try:
                count = conn.execute(text(f"SELECT count(*) FROM {t}")).scalar()
                print(f"{t}: count={count}")
            except Exception as e:
                print(f"{t}: error {e}")
        try:
            srcs = conn.execute(text("SELECT source, count(*) FROM fare_quotes GROUP BY source")).fetchall()
            print("Fare quotes by source:", srcs)
            samples = conn.execute(text("SELECT id, airline_id, route_id, flight_date, scraped_at, advance_purchase_window, total_fare, source FROM fare_quotes ORDER BY id DESC LIMIT 5")).fetchall()
            print("Latest fare quotes:")
            for s in samples:
                print(s)
            
            # Check routes
            routes = conn.execute(text("SELECT id, origin, destination, origin_city, destination_city FROM routes")).fetchall()
            print("Routes count:", len(routes), "sample:", routes[:3])
            
            # Check airlines
            airlines = conn.execute(text("SELECT id, name, code FROM airlines")).fetchall()
            print("Airlines count:", len(airlines), "sample:", airlines[:5])

            # Check collection_runs
            runs = conn.execute(text("SELECT id, started_at, status, source, origin, destination, records_collected, records_inserted FROM collection_runs ORDER BY id DESC LIMIT 5")).fetchall()
            print("Latest collection runs:")
            for r in runs:
                print(r)
        except Exception as e:
            print("Error in details:", e)
