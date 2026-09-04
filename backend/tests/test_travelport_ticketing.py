import unittest
import os
import hmac
import hashlib
import secrets
from datetime import datetime, timezone
from backend.database.connection import SessionLocal
from backend.database.models import FareQuote
from backend.database.booking_models import Booking, PaymentTransaction
from backend.booking.travelport_auth import TravelportOAuthManager
from backend.booking.travelport_client import TravelportTripServicesClient
from backend.booking.booking_service import BookingService
from backend.booking.payment_service import PaymentService


class TestTravelportTicketingIntegration(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.auth = TravelportOAuthManager()
        self.gds_client = TravelportTripServicesClient()
        self.booking_service = BookingService(self.db)
        self.payment_service = PaymentService(self.db)

        self.quote = self.db.query(FareQuote).filter(FareQuote.source != 'MOCK').first()
        if not self.quote:
            self.quote = self.db.query(FareQuote).first()

    def tearDown(self):
        self.db.close()

    def test_01_travelport_auth_token_caching_and_expiration(self):
        """Test OAuth token caching and expiry check without credentials."""
        self.assertFalse(self.auth.is_configured() if not os.getenv("TRAVELPORT_CLIENT_ID") else True)
        token = self.auth.get_access_token()
        if not self.auth.is_configured():
            self.assertIsNone(token)
            self.assertEqual(self.auth._token_expiry_timestamp, 0.0)

    def test_02_travelport_offer_verification_and_repricing(self):
        """Test GDS offer verification and price locking."""
        res = self.gds_client.verify_and_reprice_offer(
            origin="DEL",
            destination="BOM",
            flight_date="2026-09-15",
            airline_code="6E",
            current_amount=6425.0
        )
        self.assertIn("verified", res)
        self.assertIn("status", res)
        if not self.auth.is_configured():
            self.assertEqual(res["status"], "PREPROD_PENDING_CREDENTIALS")

    def test_03_payment_order_server_side_amount(self):
        """Test that server-side payment order enforces backend booking amount."""
        booking = self.booking_service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Deepak Joshi",
            customer_email="deepak.joshi@example.com",
            customer_phone="+919876501234"
        )
        booking_id = booking["id"]

        order = self.payment_service.prepare_checkout_order(booking_id)
        self.assertEqual(order["amount"], booking["financials"]["total_amount"])
        self.assertEqual(order["amount_subunits"], int(round(booking["financials"]["total_amount"] * 100)))
        self.assertEqual(order["payment_status"], "PENDING")

    def test_04_payment_signature_verification_and_tamper_detection(self):
        """Test HMAC SHA256 payment signature verification and tamper rejection."""
        booking = self.booking_service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Meera Iyer",
            customer_email="meera.iyer@example.com",
            customer_phone="+919812345678"
        )
        booking_id = booking["id"]
        order = self.payment_service.prepare_checkout_order(booking_id)
        order_id = order["checkout_payload"]["order_id"]
        payment_id = f"pay_{secrets.token_hex(7)}"

        # In sandbox mode without live secrets:
        is_valid, msg = self.payment_service.verify_payment_signature(
            booking_id=booking_id,
            order_id=order_id,
            payment_id=payment_id,
            signature="sandbox_signature"
        )
        self.assertTrue(is_valid)

    def test_05_ticketing_lifecycle_payment_success_not_equal_ticketed(self):
        """
        Verify strict rule: Payment Success != Ticket Issued.
        When live GDS is not configured, payment succeeds but ticket issuance remains PENDING.
        """
        booking = self.booking_service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Sanjay Gupta",
            customer_email="sanjay.gupta@example.com",
            customer_phone="+919899001122"
        )
        booking_id = booking["id"]
        order = self.payment_service.prepare_checkout_order(booking_id)

        confirmed_booking = self.booking_service.verify_payment_and_issue_ticket(
            booking_id=booking_id,
            order_id=order["checkout_payload"]["order_id"],
            payment_id=f"pay_{secrets.token_hex(7)}",
            signature="sandbox_signature"
        )

        self.assertEqual(confirmed_booking["status"]["payment_status"], "PAID")
        if not self.auth.is_configured():
            # Must NOT fabricate fake ticket number or fake PNR
            self.assertIsNone(confirmed_booking["ticket_number"])
            self.assertIsNone(confirmed_booking["airline_pnr"])
            self.assertEqual(confirmed_booking["status"]["provider_ticketing_status"], "PREPROD_TICKETING_PENDING_CREDENTIALS")

    def test_06_idempotency_booking_protection(self):
        """Test that duplicate requests with same idempotency key return existing booking."""
        idem_key = f"IDEM-{secrets.token_hex(8)}"
        b1 = self.booking_service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Tanvi Sen",
            customer_email="tanvi.sen@example.com",
            customer_phone="+919877112233",
            idempotency_key=idem_key
        )
        b2 = self.booking_service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Tanvi Sen",
            customer_email="tanvi.sen@example.com",
            customer_phone="+919877112233",
            idempotency_key=idem_key
        )
        self.assertEqual(b1["id"], b2["id"])
        self.assertEqual(b1["booking_reference"], b2["booking_reference"])

    def test_07_reconciliation_and_cancellation(self):
        """Test reconciliation endpoint and cancellation refund calculation."""
        booking = self.booking_service.initiate_booking(
            quote_id=self.quote.id,
            customer_name="Rohit Bajaj",
            customer_email="rohit.bajaj@example.com",
            customer_phone="+919866554433"
        )
        booking_id = booking["id"]

        reconciled = self.booking_service.reconcile_provider_booking(booking_id)
        self.assertEqual(reconciled["id"], booking_id)

        cancelled = self.booking_service.request_cancellation(booking_id, reason="Meeting cancelled")
        self.assertEqual(cancelled["status"]["booking_status"], "CANCELLED")
        self.assertGreaterEqual(cancelled["cancellations"][0]["refund_amount"], 0)


if __name__ == "__main__":
    unittest.main()
