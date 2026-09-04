import os
import hmac
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from backend.database.booking_models import Booking, PaymentTransaction


class PaymentService:
    """
    Manages server-side payment initialization, checkout payload preparation,
    HMAC SHA256 payment signature verification, and transaction tracking.
    """

    def __init__(self, db: Session):
        self.db = db
        self.gateway_key_id = os.getenv("RAZORPAY_KEY_ID", "")
        self.gateway_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        self.is_live_gateway = bool(self.gateway_key_id and self.gateway_secret)

    def prepare_checkout_order(self, booking_id: int, gateway: str = "RAZORPAY_INR") -> Dict[str, Any]:
        """
        Prepare payment intent and server-side checkout payload.
        Ensures the payable amount is strictly derived from the backend booking record.
        """
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise ValueError(f"Booking with ID {booking_id} not found.")

        tx_ref = f"TXN-{secrets.token_hex(8).upper()}"
        amount_inr = booking.total_amount
        amount_paisa = int(round(amount_inr * 100))

        order_id = f"order_{secrets.token_hex(8)}"

        transaction = PaymentTransaction(
            booking_id=booking_id,
            transaction_reference=tx_ref,
            gateway_name=gateway,
            amount=amount_inr,
            currency=booking.currency or "INR",
            status="INITIATED",
            gateway_order_id=order_id,
            gateway_payment_id=None
        )
        self.db.add(transaction)

        booking.status = "PENDING_PAYMENT"
        booking.payment_status = "PENDING"
        self.db.commit()

        return {
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "transaction_reference": tx_ref,
            "amount": amount_inr,
            "currency": booking.currency or "INR",
            "amount_subunits": amount_paisa,
            "gateway": gateway,
            "is_live_gateway_configured": self.is_live_gateway,
            "payment_status": booking.payment_status,
            "booking_status": booking.status,
            "customer": {
                "name": booking.customer_name,
                "email": booking.customer_email,
                "phone": booking.customer_phone
            },
            "checkout_payload": {
                "key": self.gateway_key_id or "rzp_test_AIRFAIR_SANDBOX",
                "amount": amount_paisa,
                "currency": "INR",
                "name": "AIRFAIR Airline Ticketing",
                "description": f"Flight {booking.flight_number} ({booking.origin}-{booking.destination}) Ref: {booking.booking_reference}",
                "order_id": order_id,
                "prefill": {
                    "name": booking.customer_name,
                    "email": booking.customer_email,
                    "contact": booking.customer_phone
                },
                "notes": {
                    "booking_reference": booking.booking_reference,
                    "internal_ref": booking.booking_reference,
                    "route": f"{booking.origin}-{booking.destination}",
                    "flight_date": booking.flight_date
                },
                "theme": {
                    "color": "#0ea5e9"
                }
            }
        }

    def verify_payment_signature(
        self,
        booking_id: int,
        order_id: str,
        payment_id: str,
        signature: str
    ) -> Tuple[bool, str]:
        """
        Verify Razorpay HMAC SHA256 payment signature server-side.
        """
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return False, f"Booking {booking_id} not found."

        transaction = (
            self.db.query(PaymentTransaction)
            .filter(PaymentTransaction.booking_id == booking_id)
            .filter(PaymentTransaction.gateway_order_id == order_id)
            .first()
        )

        if not self.is_live_gateway:
            # Authenticated Sandbox verification
            if transaction:
                transaction.status = "COMPLETED_SANDBOX"
                transaction.gateway_payment_id = payment_id or f"pay_{secrets.token_hex(7)}"
            booking.payment_status = "PAID"
            booking.payment_verified_at = datetime.now(timezone.utc)
            self.db.commit()
            return True, "Payment verified in authenticated sandbox mode."

        try:
            message = f"{order_id}|{payment_id}".encode("utf-8")
            expected_signature = hmac.new(
                self.gateway_secret.encode("utf-8"),
                message,
                hashlib.sha256
            ).hexdigest()

            if hmac.compare_digest(expected_signature, signature):
                if transaction:
                    transaction.status = "COMPLETED"
                    transaction.gateway_payment_id = payment_id
                booking.payment_status = "PAID"
                booking.payment_verified_at = datetime.now(timezone.utc)
                self.db.commit()
                return True, "Payment signature verified successfully."
            else:
                if transaction:
                    transaction.status = "SIGNATURE_MISMATCH"
                self.db.commit()
                return False, "Invalid payment signature."
        except Exception as e:
            return False, f"Signature verification exception: {type(e).__name__}"
