import unittest
from datetime import datetime, date, timedelta, timezone
from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline
from backend.database.booking_models import Booking, BookingPassenger, BookingSeat, BookingAddOn
from backend.booking.booking_service import BookingService
from backend.booking.payment_service import PaymentService
from backend.booking.booking_provider_interface import StandardAirBookingProvider


class TestBookingModule(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.service = BookingService(self.db)
        self.payment_service = PaymentService(self.db)

        # Retrieve a valid authentic quote from DB
        self.quote = self.db.query(FareQuote).filter(FareQuote.source != 'MOCK').first()
        if not self.quote:
            self.quote = self.db.query(FareQuote).first()

    def tearDown(self):
        self.db.close()

    def test_01_booking_initiation(self):
        """Test initial booking creation linked to a fare quote."""
        self.assertIsNotNone(self.quote, "At least one fare quote must exist in the database.")

        booking = self.service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Aarav Sharma",
            customer_email="aarav.sharma@example.com",
            customer_phone="+919876543210",
            cabin_class="ECONOMY"
        )

        self.assertIsNotNone(booking["id"])
        self.assertTrue(booking["booking_reference"].startswith("AIR-"))
        self.assertEqual(booking["customer"]["name"], "Aarav Sharma")
        self.assertEqual(booking["status"]["booking_status"], "DRAFT")
        self.assertEqual(booking["status"]["payment_status"], "UNPAID")
        self.assertGreater(booking["financials"]["total_amount"], 0)

    def test_02_passenger_management_and_recalculation(self):
        """Test adding passengers and verifying base fare scaling."""
        booking = self.service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Priya Patel",
            customer_email="priya.patel@example.com",
            customer_phone="+919811223344"
        )
        booking_id = booking["id"]

        passengers_data = [
            {"title": "Ms", "first_name": "Priya", "last_name": "Patel", "gender": "Female", "date_of_birth": "1994-05-12"},
            {"title": "Mr", "first_name": "Rohan", "last_name": "Patel", "gender": "Male", "date_of_birth": "1992-08-20"}
        ]

        updated = self.service.add_passengers(booking_id, passengers_data)
        self.assertEqual(len(updated["passengers"]), 2)
        # 2 passengers should double base fare
        single_base = float(self.quote.base_fare or self.quote.total_fare * 0.82)
        self.assertAlmostEqual(updated["financials"]["base_fare"], single_base * 2, places=1)

    def test_03_seat_selection_and_pricing(self):
        """Test assigning seats with window/aisle and extra-legroom pricing."""
        booking = self.service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Vikram Singh",
            customer_email="vikram.singh@example.com",
            customer_phone="+919844556677"
        )
        booking_id = booking["id"]

        # Add 2 passengers
        updated = self.service.add_passengers(booking_id, [
            {"title": "Mr", "first_name": "Vikram", "last_name": "Singh", "gender": "Male"},
            {"title": "Mrs", "first_name": "Neha", "last_name": "Singh", "gender": "Female"}
        ])
        p1_id = updated["passengers"][0]["id"]
        p2_id = updated["passengers"][1]["id"]

        # Assign 1 Extra Legroom (800) and 1 Window (350)
        seats_data = [
            {"passenger_id": p1_id, "seat_number": "1A", "seat_type": "EXTRA_LEGROOM", "price": 800.0},
            {"passenger_id": p2_id, "seat_number": "1B", "seat_type": "WINDOW", "price": 350.0}
        ]

        booking_with_seats = self.service.select_seats(booking_id, seats_data)
        self.assertEqual(len(booking_with_seats["seats"]), 2)
        self.assertEqual(booking_with_seats["financials"]["seats_total"], 1150.0)

    def test_04_ancillary_add_ons(self):
        """Test adding baggage, meals, and insurance add-ons."""
        booking = self.service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Ananya Reddy",
            customer_email="ananya.reddy@example.com",
            customer_phone="+919877665544"
        )
        booking_id = booking["id"]

        add_ons = [
            {"category": "BAGGAGE", "title": "Excess Baggage (10kg)", "unit_price": 900.0, "quantity": 1},
            {"category": "MEAL", "title": "Paneer Tikka Meal", "unit_price": 450.0, "quantity": 2},
            {"category": "INSURANCE", "title": "Comprehensive Domestic Travel Insurance", "unit_price": 249.0, "quantity": 1}
        ]

        booking_with_addons = self.service.add_ancillaries(booking_id, add_ons)
        self.assertEqual(len(booking_with_addons["add_ons"]), 3)
        expected_addons_total = 900.0 + (450.0 * 2) + 249.0  # 2049.0
        self.assertEqual(booking_with_addons["financials"]["add_ons_total"], expected_addons_total)

    def test_05_checkout_and_payment_architecture(self):
        """Test payment order preparation and transaction logging."""
        booking = self.service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Kavita Nair",
            customer_email="kavita.nair@example.com",
            customer_phone="+919833445566"
        )
        booking_id = booking["id"]

        order = self.payment_service.prepare_checkout_order(booking_id)
        self.assertEqual(order["booking_id"], booking_id)
        self.assertTrue(order["transaction_reference"].startswith("TXN-"))
        self.assertIn("checkout_payload", order)
        self.assertEqual(order["checkout_payload"]["currency"], "INR")

    def test_06_cancellation_workflow(self):
        """Test flight booking cancellation and refund calculation."""
        booking = self.service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Rahul Varma",
            customer_email="rahul.varma@example.com",
            customer_phone="+919822334455"
        )
        booking_id = booking["id"]

        cancelled = self.service.request_cancellation(booking_id, reason="Trip rescheduled by company.")
        self.assertEqual(cancelled["status"]["booking_status"], "CANCELLED")
        self.assertEqual(len(cancelled["cancellations"]), 1)
        self.assertGreater(cancelled["cancellations"][0]["refund_amount"], 0)

    def test_07_provider_separation(self):
        """Verify that missing live GDS keys return honest disconnected status without fake PNR generation."""
        provider = StandardAirBookingProvider()
        res = provider.check_live_fare_lock(self.quote.id, "DEL", "BOM", "2026-09-10")
        self.assertIn("status", res)
        # Confirm it doesn't fake an external ticketing success when keys are missing
        if not provider.is_live_provider_connected():
            self.assertIn(res["status"], ["PROVIDER_PENDING_LIVE_GDS_CREDENTIALS", "PREPROD_PENDING_CREDENTIALS"])



if __name__ == "__main__":
    unittest.main()
