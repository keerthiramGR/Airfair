"""
AIRFAIR Database Initialization & Seeding Utility
Smart India Hackathon 2026 — Problem Statement 26056
Phase 3: Supabase PostgreSQL

Usage:
    python backend/scripts/seed_db.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Locate directories
scripts_dir = Path(__file__).resolve().parent
backend_dir = scripts_dir.parent
root_dir = backend_dir.parent

# Load environment
for env_path in [backend_dir / ".env", root_dir / ".env"]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def run_seeder():
    print("=" * 70)
    print("  AIRFAIR — Supabase PostgreSQL Database Initializer & Seeder")
    print("=" * 70)

    if not DATABASE_URL or "YOUR_SUPABASE_PASSWORD" in DATABASE_URL:
        print("\n[!] Error: Valid DATABASE_URL not detected in backend/.env or .env")
        print("\nTo seed your Supabase database:")
        print("1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/fqnjafaqupgkfehdlvsr")
        print("2. Go to Project Settings -> Database -> Connection string -> URI")
        print("3. Copy the URI and replace [YOUR-PASSWORD] with your database password.")
        print("4. Save it into backend/.env, for example:")
        print("   DATABASE_URL=postgresql://postgres:MySecretPassword@db.fqnjafaqupgkfehdlvsr.supabase.co:5432/postgres")
        print("5. Re-run: python backend/scripts/seed_db.py")
        print("\nAlternatively, you can copy the contents of:")
        print("   - backend/database/schema.sql")
        print("   - backend/database/seed.sql")
        print("directly into the Supabase SQL Editor and click 'Run'.\n")
        return False

    print(f"[*] Target Database URI: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local/custom'}")
    print("[*] Connecting to Supabase PostgreSQL...")

    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            # 1. Execute schema.sql
            schema_file = backend_dir / "database" / "schema.sql"
            if schema_file.exists():
                print(f"[*] Applying Schema DDL from {schema_file.name}...")
                schema_sql = schema_file.read_text(encoding="utf-8")
                # Split and execute statements or execute directly
                conn.execute(text(schema_sql))
                conn.commit()
                print("    [+] Tables and indexes successfully verified / created.")
            else:
                print(f"[!] Warning: Schema file not found at {schema_file}")

            # 2. Execute seed.sql
            seed_file = backend_dir / "database" / "seed.sql"
            if seed_file.exists():
                print(f"[*] Inserting Seed Records from {seed_file.name}...")
                seed_sql = seed_file.read_text(encoding="utf-8")
                conn.execute(text(seed_sql))
                conn.commit()
                print("    [+] Seed data successfully loaded into database.")
            else:
                print(f"[!] Warning: Seed file not found at {seed_file}")

            # 3. Verification Counts
            print("\n" + "-" * 40)
            print("  SUPABASE VERIFICATION: TABLE ROW COUNTS")
            print("-" * 40)
            tables = [
                "airlines",
                "routes",
                "data_sources",
                "fare_quotes",
                "airfare_index",
                "price_forecasts",
                "alerts"
            ]

            for table in tables:
                res = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                print(f"  • {table.ljust(18)} : {res} records")

            print("-" * 40)
            print("[✓] Supabase PostgreSQL database initialization complete!\n")
            return True

    except Exception as exc:
        print(f"\n[!] Database seeding failed: {exc}")
        print("Please check your database credentials and ensure Supabase allows connections from your IP.\n")
        return False


if __name__ == "__main__":
    success = run_seeder()
    sys.exit(0 if success else 1)
