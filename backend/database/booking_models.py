from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from backend.database.models import Base


def utc_now():
    return datetime.now(timezone.utc)


class Booking(Base):
    """
    Core flight booking model for AIRFAIR.
    Tracks PNR reference, linked fare quote, passenger roster, total pricing breakdown,
    payment status, and booking lifecycle state.
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(20), unique=True, index=True, nullable=False)  # e.g., AIR-8F92A1
    quote_id = Column(Integer, ForeignKey("fare_quotes.id"), nullable=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True, index=True)
    airline_id = Column(Integer, ForeignKey("airlines.id"), nullable=True, index=True)

    # Flight Details Snapshot
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    flight_date = Column(String(20), nullable=False)
    airline_code = Column(String(10), nullable=False)
    airline_name = Column(String(100), nullable=False)
    flight_number = Column(String(30), nullable=True)
    cabin_class = Column(String(20), default="ECONOMY", nullable=False)

    # Customer Contact
    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), nullable=False, index=True)
    customer_phone = Column(String(30), nullable=False)

    # Financial Breakdown
    base_fare = Column(Float, nullable=False, default=0.0)
    taxes_and_fees = Column(Float, nullable=False, default=0.0)
    user_development_fee = Column(Float, nullable=False, default=0.0)
    convenience_fee = Column(Float, nullable=False, default=0.0)
    seats_total = Column(Float, nullable=False, default=0.0)
    add_ons_total = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), default="INR", nullable=False)

    # Lifecycle & Provider State
    status = Column(String(60), default="DRAFT", nullable=False, index=True)  # DRAFT, PENDING_PAYMENT, CONFIRMED, CANCELLED, REFUNDED
    payment_status = Column(String(30), default="UNPAID", nullable=False)  # UNPAID, PENDING, PAID, FAILED

    provider_name = Column(String(50), default="TRAVELPORT_TRIPSERVICES", nullable=False)
    provider_status = Column(String(50), default="PENDING_LIVE_GDS_CREDENTIALS", nullable=False)
    provider_booking_reference = Column(String(50), nullable=True)  # Universal Record / Locator
    provider_reservation_id = Column(String(100), nullable=True)  # Air reservation workbench ID
    airline_pnr = Column(String(50), nullable=True, index=True)  # Actual airline PNR from carrier
    ticket_number = Column(String(50), nullable=True, index=True)  # Actual 13-digit IATA e-ticket number
    provider_ticketing_status = Column(String(50), default="OFFER_VALIDATED", nullable=True)
    provider_last_response_reference = Column(String(100), nullable=True)
    idempotency_key = Column(String(100), unique=True, nullable=True, index=True)

    travel_date = Column(String(30), nullable=True)  # Actual flight journey date (e.g., 2026-10-24)
    auto_book_execution_date = Column(String(30), nullable=True)  # Date to trigger automated booking (e.g., 2026-09-12)
    ticketed_at = Column(DateTime(timezone=True), nullable=True)
    payment_verified_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    passengers = relationship("BookingPassenger", back_populates="booking", cascade="all, delete-orphan")
    seats = relationship("BookingSeat", back_populates="booking", cascade="all, delete-orphan")
    add_ons = relationship("BookingAddOn", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("PaymentTransaction", back_populates="booking", cascade="all, delete-orphan")
    cancellations = relationship("BookingCancellation", back_populates="booking", cascade="all, delete-orphan")



class BookingPassenger(Base):
    """
    Passenger details associated with a booking.
    """
    __tablename__ = "booking_passengers"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    title = Column(String(10), nullable=False)  # Mr, Mrs, Ms, Dr
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    gender = Column(String(20), nullable=False)
    date_of_birth = Column(String(20), nullable=True)
    passport_or_id = Column(String(50), nullable=True)
    frequent_flyer_number = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    booking = relationship("Booking", back_populates="passengers")
    seats = relationship("BookingSeat", back_populates="passenger")


class BookingSeat(Base):
    """
    Seat selection record for a passenger in a booking.
    """
    __tablename__ = "booking_seats"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    passenger_id = Column(Integer, ForeignKey("booking_passengers.id"), nullable=True, index=True)
    seat_number = Column(String(10), nullable=False)  # e.g., 12A, 14F
    seat_class = Column(String(20), default="ECONOMY", nullable=False)
    seat_type = Column(String(30), default="STANDARD", nullable=False)  # WINDOW, AISLE, EXTRA_LEGROOM, STANDARD
    price = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    booking = relationship("Booking", back_populates="seats")
    passenger = relationship("BookingPassenger", back_populates="seats")


class BookingAddOn(Base):
    """
    Baggage, Meals, and Ancillary Add-Ons attached to a booking.
    """
    __tablename__ = "booking_add_ons"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    category = Column(String(30), nullable=False)  # BAGGAGE, MEAL, INSURANCE, PRIORITY_BOARDING
    title = Column(String(150), nullable=False)
    unit_price = Column(Float, default=0.0, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    total_price = Column(Float, default=0.0, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    booking = relationship("Booking", back_populates="add_ons")


class PaymentTransaction(Base):
    """
    Payment transaction record for a booking.
    """
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    transaction_reference = Column(String(100), unique=True, index=True, nullable=False)
    gateway_name = Column(String(50), default="RAZORPAY_INR", nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(30), default="INITIATED", nullable=False)  # INITIATED, PENDING_CREDENTIALS, COMPLETED, FAILED
    gateway_order_id = Column(String(100), nullable=True)
    gateway_payment_id = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    booking = relationship("Booking", back_populates="payments")


class BookingCancellation(Base):
    """
    Cancellation and Refund record for a booking.
    """
    __tablename__ = "booking_cancellations"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    cancellation_fee = Column(Float, default=0.0, nullable=False)
    refund_amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(30), default="SUBMITTED", nullable=False)  # SUBMITTED, APPROVED, REFUNDED, REJECTED
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    booking = relationship("Booking", back_populates="cancellations")
