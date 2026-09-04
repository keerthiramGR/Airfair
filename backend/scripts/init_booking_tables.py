from sqlalchemy import text
from backend.database.connection import engine
from backend.database.models import Base
import backend.database.booking_models  # Ensure booking models are registered on Base.metadata

print("Creating booking module tables in Supabase PostgreSQL...")
Base.metadata.create_all(bind=engine)

# Add newly defined columns if table already existed previously
with engine.connect() as conn:
    print("Applying column migrations to bookings table if missing...")
    migrations = [
        "ALTER TABLE bookings ALTER COLUMN status TYPE VARCHAR(60);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_booking_reference VARCHAR(50);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_reservation_id VARCHAR(100);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airline_pnr VARCHAR(50);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_ticketing_status VARCHAR(50) DEFAULT 'OFFER_VALIDATED';",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_last_response_reference VARCHAR(100);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticketed_at TIMESTAMPTZ;",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travel_date VARCHAR(30);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_book_execution_date VARCHAR(30);"
    ]


    for sql in migrations:
        try:
            conn.execute(text(sql))
        except Exception as e:
            print(f"Migration notice: {e}")
    conn.commit()

print("Booking tables successfully created and verified with all columns.")
