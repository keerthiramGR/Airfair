from backend.database.connection import ensure_tables, get_engine
from sqlalchemy import text

print("Ensuring Phase 6 tables in Supabase PostgreSQL...")
ensure_tables()

eng = get_engine()
if eng:
    with eng.connect() as conn:
        tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
        print("All Tables:", [t[0] for t in tables])
        if 'airfare_price_index' in [t[0] for t in tables]:
            cols = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='airfare_price_index'")).fetchall()
            print("Columns in airfare_price_index:", cols)
            print("Successfully verified airfare_price_index in Supabase!")
        else:
            print("WARNING: airfare_price_index not found.")
