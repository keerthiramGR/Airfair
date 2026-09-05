"""
AIRFAIR Auto-Booking Scheduler API Router
==========================================
Provides management and monitoring endpoints for the background
auto-booking scheduler:
  - GET  /api/scheduler/status   : Health, next run time, and today's queue count
  - POST /api/scheduler/run-now  : Trigger the auto-booking sweep immediately
  - GET  /api/scheduler/history  : List recent AUTO_BOOKED & AUTO_BOOK_FAILED records
  - GET  /api/scheduler/pending  : List all future SCHEDULED_CONFIRMED bookings
"""

import logging
from datetime import date, datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.connection import get_db
from backend.database.booking_models import Booking, BookingPassenger
from backend.jobs.auto_booking_scheduler import run_auto_booking_job, ELIGIBLE_STATUSES

logger = logging.getLogger("airfair.scheduler_router")

router = APIRouter(prefix="/api/scheduler", tags=["Auto-Booking Scheduler"])


@router.get("/status")
def get_scheduler_status(db: Session = Depends(get_db)):
    """
    Get current scheduler health, timezone info, and queue snapshot for today.
    """
    today_str = date.today().isoformat()
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        due_today_count = (
            db.query(Booking)
            .filter(Booking.auto_book_execution_date == today_str)
            .filter(Booking.status.in_(ELIGIBLE_STATUSES))
            .count()
        )

        future_scheduled_count = (
            db.query(Booking)
            .filter(Booking.auto_book_execution_date > today_str)
            .filter(Booking.status == "SCHEDULED_CONFIRMED")
            .count()
        )

        auto_booked_total = (
            db.query(Booking)
            .filter(Booking.status == "AUTO_BOOKED")
            .count()
        )

        auto_book_failed_total = (
            db.query(Booking)
            .filter(Booking.status == "AUTO_BOOK_FAILED")
            .count()
        )

        return {
            "status": "active",
            "cron_schedule": "Daily at 06:00 IST (00:30 UTC)",
            "server_time_utc": now_utc,
            "today_date": today_str,
            "queue_summary": {
                "due_today": due_today_count,
                "future_scheduled": future_scheduled_count,
                "auto_booked_total": auto_booked_total,
                "auto_book_failed_total": auto_book_failed_total,
            },
            "eligible_statuses": list(ELIGIBLE_STATUSES),
        }
    except Exception as e:
        logger.error("[Scheduler Status Error] %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-now")
def trigger_auto_booking_job():
    """
    Admin action: trigger the auto-booking sweep immediately.
    Processes all eligible bookings scheduled for today.
    """
    logger.info("[Scheduler API] Manual run-now triggered via API")
    try:
        summary = run_auto_booking_job()
        return {
            "message": "Auto-booking job completed successfully.",
            "summary": summary
        }
    except Exception as e:
        logger.error("[Scheduler API run-now FAIL] %s", e)
        raise HTTPException(status_code=500, detail=f"Job execution failed: {str(e)}")


@router.get("/pending")
def list_pending_scheduled_bookings(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all bookings currently waiting for their scheduled execution date.
    """
    try:
        bookings = (
            db.query(Booking)
            .filter(Booking.status.in_(["SCHEDULED_CONFIRMED", "PAYMENT_VERIFIED_TICKETING_PENDING"]))
            .order_by(Booking.auto_book_execution_date.asc())
            .limit(limit)
            .all()
        )

        items = []
        for b in bookings:
            pax = db.query(BookingPassenger).filter(BookingPassenger.booking_id == b.id).all()
            items.append({
                "id": b.id,
                "booking_reference": b.booking_reference,
                "status": b.status,
                "origin": b.origin,
                "destination": b.destination,
                "airline_name": b.airline_name,
                "flight_number": b.flight_number,
                "flight_date": b.flight_date,
                "travel_date": b.travel_date,
                "auto_book_execution_date": b.auto_book_execution_date,
                "customer_name": b.customer_name,
                "customer_email": b.customer_email,
                "total_amount": b.total_amount,
                "payment_status": b.payment_status,
                "passenger_count": len(pax),
                "created_at": b.created_at.isoformat() if b.created_at else None,
            })

        return {
            "total": len(items),
            "pending_bookings": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def list_auto_booking_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List past auto-booking results (AUTO_BOOKED and AUTO_BOOK_FAILED).
    """
    try:
        bookings = (
            db.query(Booking)
            .filter(Booking.status.in_(["AUTO_BOOKED", "AUTO_BOOK_FAILED"]))
            .order_by(desc(Booking.updated_at))
            .limit(limit)
            .all()
        )

        items = []
        for b in bookings:
            items.append({
                "id": b.id,
                "booking_reference": b.booking_reference,
                "status": b.status,
                "origin": b.origin,
                "destination": b.destination,
                "airline_name": b.airline_name,
                "flight_number": b.flight_number,
                "flight_date": b.flight_date,
                "auto_book_execution_date": b.auto_book_execution_date,
                "customer_name": b.customer_name,
                "customer_email": b.customer_email,
                "total_amount": b.total_amount,
                "ticket_number": b.ticket_number,
                "airline_pnr": b.airline_pnr,
                "provider_ticketing_status": b.provider_ticketing_status,
                "updated_at": b.updated_at.isoformat() if b.updated_at else None,
            })

        return {
            "total": len(items),
            "history": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
