from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr, Field

from backend.database.connection import get_db
from backend.booking.booking_service import BookingService
from backend.booking.payment_service import PaymentService

router = APIRouter(prefix="/api/bookings", tags=["Flight Bookings"])


# --- Request Schemas ---

class InitiateBookingRequest(BaseModel):
    quote_id: Optional[int] = None
    customer_name: Optional[str] = "Aditya Kumar"
    customer_email: Optional[str] = "aditya.kumar@example.com"
    customer_phone: Optional[str] = "+919876543210"
    cabin_class: Optional[str] = "ECONOMY"
    origin: Optional[str] = "DEL"
    destination: Optional[str] = "BOM"
    flight_date: Optional[str] = "2026-10-15"
    travel_date: Optional[str] = None
    auto_book_execution_date: Optional[str] = None
    scheduled_booking_date: Optional[str] = None
    airline_code: Optional[str] = "6E"
    airline_name: Optional[str] = "IndiGo"
    flight_number: Optional[str] = None
    total_fare: Optional[float] = 5450.0


class PassengerItem(BaseModel):
    title: str = "Mr"
    first_name: str
    last_name: str
    gender: str = "Male"
    date_of_birth: Optional[str] = None
    passport_or_id: Optional[str] = None
    frequent_flyer_number: Optional[str] = None


class AddPassengersRequest(BaseModel):
    passengers: List[PassengerItem]


class SeatItem(BaseModel):
    passenger_id: Optional[int] = None
    seat_number: str
    seat_class: str = "ECONOMY"
    seat_type: str = "STANDARD"  # STANDARD, WINDOW, AISLE, EXTRA_LEGROOM
    price: Optional[float] = None


class SelectSeatsRequest(BaseModel):
    seats: List[SeatItem]


class AddOnItem(BaseModel):
    category: str  # BAGGAGE, MEAL, INSURANCE, PRIORITY_BOARDING
    title: str
    unit_price: float
    quantity: int = 1
    details: Optional[Dict[str, Any]] = None


class AddAncillariesRequest(BaseModel):
    add_ons: List[AddOnItem]


class CancelBookingRequest(BaseModel):
    reason: str = Field(..., min_length=3)


# --- Endpoints ---

@router.post("/initiate")
def initiate_booking(req: InitiateBookingRequest, db: Session = Depends(get_db)):
    """Initiate a booking session from verified quote or corridor selection."""
    service = BookingService(db)
    try:
        booking = service.initiate_booking(
            quote_id=req.quote_id,
            customer_name=req.customer_name,
            customer_email=req.customer_email,
            customer_phone=req.customer_phone,
            cabin_class=req.cabin_class,
            origin=req.origin,
            destination=req.destination,
            flight_date=req.flight_date,
            travel_date=req.travel_date or req.flight_date,
            auto_book_execution_date=req.auto_book_execution_date or req.scheduled_booking_date,
            airline_code=req.airline_code,
            airline_name=req.airline_name,
            flight_number=req.flight_number,
            total_fare=req.total_fare
        )
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate booking: {str(e)}")


@router.get("/{booking_id}")
def get_booking_details(booking_id: int, db: Session = Depends(get_db)):
    """Retrieve full booking details by ID."""
    service = BookingService(db)
    try:
        return service.get_booking_details(booking_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/pnr/{reference}")
def get_booking_by_pnr(reference: str, db: Session = Depends(get_db)):
    """Retrieve booking details by PNR reference code."""
    service = BookingService(db)
    booking = service.get_booking_by_reference(reference)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking reference {reference} not found.")
    return booking


@router.post("/{booking_id}/passengers")
def add_passengers(booking_id: int, req: AddPassengersRequest, db: Session = Depends(get_db)):
    """Attach passenger roster to booking."""
    service = BookingService(db)
    try:
        passengers_data = [p.dict() for p in req.passengers]
        booking = service.add_passengers(booking_id, passengers_data)
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{booking_id}/seats")
def select_seats(booking_id: int, req: SelectSeatsRequest, db: Session = Depends(get_db)):
    """Select passenger seats and update pricing."""
    service = BookingService(db)
    try:
        seats_data = [s.dict() for s in req.seats]
        booking = service.select_seats(booking_id, seats_data)
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{booking_id}/add-ons")
def add_ancillaries(booking_id: int, req: AddAncillariesRequest, db: Session = Depends(get_db)):
    """Add baggage, meal, and insurance add-ons."""
    service = BookingService(db)
    try:
        add_ons_data = [a.dict() for a in req.add_ons]
        booking = service.add_ancillaries(booking_id, add_ons_data)
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{booking_id}/summary")
def get_booking_summary(booking_id: int, db: Session = Depends(get_db)):
    """Get live fare breakdown summary for booking."""
    service = BookingService(db)
    try:
        booking = service.get_booking_details(booking_id)
        return {
            "booking_reference": booking["booking_reference"],
            "flight": booking["flight"],
            "financials": booking["financials"],
            "passengers_count": len(booking["passengers"]),
            "seats_count": len(booking["seats"]),
            "add_ons_count": len(booking["add_ons"]),
            "status": booking["status"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{booking_id}/checkout")
def checkout_booking(booking_id: int, gateway: str = "RAZORPAY_INR", db: Session = Depends(get_db)):
    """Prepare server-side payment order and checkout payload."""
    payment_service = PaymentService(db)
    try:
        order = payment_service.prepare_checkout_order(booking_id, gateway=gateway)
        return {"status": "success", "order": order}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: Optional[str] = "sandbox_signature"


@router.post("/{booking_id}/verify-payment")
def verify_payment_and_issue_ticket(
    booking_id: int,
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Verify payment signature server-side and trigger Travelport TripServices live ticketing.
    Strictly separates payment success from ticket issuance.
    """
    service = BookingService(db)
    try:
        booking = service.verify_payment_and_issue_ticket(
            booking_id=booking_id,
            order_id=req.order_id,
            payment_id=req.payment_id,
            signature=req.signature or ""
        )
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ticketing commit error: {str(e)}")


@router.post("/{booking_id}/reconcile")
def reconcile_booking_with_gds(booking_id: int, db: Session = Depends(get_db)):
    """Reconcile live PNR and e-ticket status from Travelport."""
    service = BookingService(db)
    try:
        booking = service.reconcile_provider_booking(booking_id)
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{booking_id}/cancel")
def cancel_booking(booking_id: int, req: CancelBookingRequest, db: Session = Depends(get_db)):
    """Submit cancellation request for booking."""
    service = BookingService(db)
    try:
        booking = service.request_cancellation(booking_id, reason=req.reason)
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))



@router.get("")
def list_bookings(email: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """List bookings for customer or system."""
    service = BookingService(db)
    return service.list_bookings(email=email, limit=limit)


# --- Admin Router ---
admin_booking_router = APIRouter(prefix="/api/admin/bookings", tags=["Admin Booking Management"])

@admin_booking_router.get("")
def get_admin_bookings_overview(limit: int = 100, db: Session = Depends(get_db)):
    """Admin dashboard view for all bookings and financial metrics."""
    service = BookingService(db)
    all_bookings = service.list_bookings(limit=limit)

    total_revenue = sum(b["financials"]["total_amount"] for b in all_bookings if b["status"]["payment_status"] == "PAID")
    confirmed_count = sum(1 for b in all_bookings if b["status"]["booking_status"] == "CONFIRMED")
    cancelled_count = sum(1 for b in all_bookings if b["status"]["booking_status"] == "CANCELLED")

    return {
        "metrics": {
            "total_bookings": len(all_bookings),
            "confirmed_bookings": confirmed_count,
            "cancelled_bookings": cancelled_count,
            "total_revenue_inr": round(total_revenue, 2)
        },
        "bookings": all_bookings
    }
