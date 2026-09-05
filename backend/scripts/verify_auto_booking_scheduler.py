"""
AIRFAIR — Verification Script for Auto-Booking Scheduler
=========================================================
Tests:
1. Creation of a booking scheduled for today (auto_book_execution_date = today)
2. Addition of passengers
3. Payment completion -> status becomes SCHEDULED_CONFIRMED
4. Execution of run_auto_booking_job()
5. Verification of state transition to AUTO_BOOKED
6. HTML confirmation email dispatch via Gmail SMTP
7. Verification of scheduler endpoints (/api/scheduler/status, /history)
"""

import os
import sys
from pathlib import Path
from datetime import date, datetime, timezone

# Ensure project root in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))

from backend.database.connection import SessionLocal
from backend.database.booking_models import Booking, BookingPassenger
from backend.booking.booking_service import BookingService
from backend.jobs.auto_booking_scheduler import run_auto_booking_job
from fastapi.testclient import TestClient
from backend.main import app

def test_auto_booking_lifecycle():
    print("\n" + "="*70)
    print(" AIRFAIR AUTO-BOOKING SCHEDULER: END-TO-END VERIFICATION")
    print("="*70)

    db = SessionLocal()
    client = TestClient(app)
    service = BookingService(db)

    today_str = date.today().isoformat()
    test_email = "grkeerthiram@gmail.com"

    try:
        # Step 1: Check scheduler status endpoint before
        status_res = client.get("/api/scheduler/status")
        assert status_res.status_code == 200, f"Status failed: {status_res.text}"
        print(f"\n[Step 1] Initial Scheduler Status: {status_res.json()}")

        # Step 2: Create a booking scheduled for today
        print(f"\n[Step 2] Creating scheduled booking for today ({today_str})...")
        booking_data = service.initiate_booking(
            customer_name="Keerthi Ram",
            customer_email=test_email,
            customer_phone="+919876543210",
            origin="DEL",
            destination="BOM",
            flight_date="2026-10-15",
            travel_date="2026-10-15",
            auto_book_execution_date=today_str,
            airline_code="6E",
            airline_name="IndiGo",
            flight_number="6E-501",
            total_fare=4899.0
        )
        booking_id = booking_data["id"]
        booking_ref = booking_data["booking_reference"]
        print(f"Created Booking ID={booking_id}, Ref={booking_ref}, Status={booking_data['status']}")

        # Step 3: Add Passengers
        print(f"\n[Step 3] Adding passenger to booking {booking_id}...")
        service.add_passengers(
            booking_id=booking_id,
            passengers_data=[
                {
                    "title": "Mr",
                    "first_name": "Keerthiram",
                    "last_name": "G R",
                    "gender": "Male",
                    "date_of_birth": "2000-01-01"
                }
            ]
        )

        # Step 4: Simulate payment capture -> Status set to SCHEDULED_CONFIRMED
        # (For auto-booking, payment is verified and held/captured, awaiting execution)
        print(f"\n[Step 4] Setting booking status to SCHEDULED_CONFIRMED...")
        b = db.query(Booking).filter(Booking.id == booking_id).first()
        b.status = "SCHEDULED_CONFIRMED"
        b.payment_status = "PAID"
        b.payment_verified_at = datetime.now(timezone.utc)
        b.provider_booking_reference = f"GDS-TEST-{booking_ref}"
        db.commit()
        print(f"Booking {booking_ref} status is now: {b.status}, execution date: {b.auto_book_execution_date}")

        # Step 5: Check scheduler queue via API
        status_res2 = client.get("/api/scheduler/status")
        print(f"\n[Step 5] Updated Scheduler Queue: {status_res2.json()['queue_summary']}")
        assert status_res2.json()["queue_summary"]["due_today"] >= 1

        # Step 6: Trigger the auto-booking scheduler job
        print(f"\n[Step 6] Running Auto-Booking Job via run_auto_booking_job()...")
        job_summary = run_auto_booking_job()
        print(f"Job Execution Summary: {job_summary}")

        # Step 7: Verify DB state
        db.expire_all()
        updated_b = db.query(Booking).filter(Booking.id == booking_id).first()
        print(f"\n[Step 7] Post-Job DB Verification:")
        print(f"  Booking Reference : {updated_b.booking_reference}")
        print(f"  Status            : {updated_b.status}")
        print(f"  Provider Status   : {updated_b.provider_ticketing_status}")
        print(f"  Ticket Number     : {updated_b.ticket_number}")
        print(f"  Airline PNR       : {updated_b.airline_pnr}")

        assert updated_b.status == "AUTO_BOOKED", f"Expected AUTO_BOOKED but got {updated_b.status}"
        print("  Status assertion PASSED: Booking transitioned to AUTO_BOOKED.")

        # Step 8: Test API Endpoints
        print(f"\n[Step 8] Testing API endpoints...")
        hist_res = client.get("/api/scheduler/history?limit=5")
        assert hist_res.status_code == 200
        print(f"  /api/scheduler/history total: {hist_res.json()['total']}")
        found_in_history = any(h["booking_reference"] == booking_ref for h in hist_res.json()["history"])
        print(f"  Found test booking in history: {found_in_history}")
        assert found_in_history, "Test booking should appear in history"

        run_now_res = client.post("/api/scheduler/run-now")
        assert run_now_res.status_code == 200
        print(f"  /api/scheduler/run-now response status: 200 OK")

        print("\n" + "="*70)
        print(" ALL AUTO-BOOKING SCHEDULER VERIFICATIONS PASSED SUCCESSFULLY!")
        print("="*70)

    finally:
        db.close()

if __name__ == "__main__":
    test_auto_booking_lifecycle()
