from backend.database.connection import ensure_tables, get_engine
from sqlalchemy import text

print("Ensuring all tables are created in Supabase PostgreSQL...")
ensure_tables()

eng = get_engine()
if eng:
    with eng.connect() as conn:
        tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
        print("Existing Tables:", [t[0] for t in tables])
        if 'fare_daily_summary' in [t[0] for t in tables]:
            cols = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='fare_daily_summary'")).fetchall()
            print("Columns in fare_daily_summary:", cols)
            print("Successfully verified fare_daily_summary in Supabase!")
        else:
            print("WARNING: fare_daily_summary not found.")
