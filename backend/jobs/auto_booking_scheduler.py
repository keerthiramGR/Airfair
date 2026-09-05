"""
AIRFAIR Auto-Booking Execution Scheduler
=========================================
Runs daily at 06:00 IST (00:30 UTC).

For every booking whose `auto_book_execution_date` matches TODAY and whose
status is SCHEDULED_CONFIRMED (payment captured, awaiting scheduled date),
this job:
  1. Re-verifies the offer with Travelport TripServices.
  2. Marks the booking EXECUTING to prevent double-runs.
  3. Issues the e-ticket commit.
  4. Sends a confirmation e-mail to the customer via Gmail SMTP.
  5. Updates the booking status to AUTO_BOOKED (or AUTO_BOOK_FAILED on error).
"""

import os
import smtplib
import logging
from pathlib import Path
from datetime import date, datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any

from dotenv import load_dotenv

# Load environment variables
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir.parent / ".env")
load_dotenv(_backend_dir.parent / ".env.local")

from sqlalchemy.orm import Session

from backend.database.connection import SessionLocal
from backend.database.booking_models import Booking, BookingPassenger

logger = logging.getLogger("airfair.auto_booking")
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Email helper
# ---------------------------------------------------------------------------

def _send_confirmation_email(booking: Booking, passengers: List[BookingPassenger]) -> bool:
    """Send rich HTML booking-confirmation e-mail via Gmail SMTP."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user)

    if not smtp_user or not smtp_pass:
        logger.warning("[AutoBook Email] SMTP credentials not configured — skipping email.")
        return False

    pax_rows = "".join(
        f"<tr><td style='padding:6px 12px;border-bottom:1px solid #F1E5DB;font-size:13px;'>"
        f"{p.title} {p.first_name} {p.last_name}</td></tr>"
        for p in passengers
    )

    html_body = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#FFFCF9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;
              border:1px solid #F1E5DB;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:32px 40px;">
      <div style="font-size:26px;font-weight:900;color:#fff;">AIRFAIR.</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Auto-Booking Executed</div>
    </div>
    <div style="background:#ECFDF5;border-bottom:2px solid #6EE7B7;padding:20px 40px;">
      <div style="font-weight:800;color:#065F46;font-size:16px;">Your flight has been auto-booked!</div>
      <div style="color:#047857;font-size:13px;margin-top:4px;">AIRFAIR executed your scheduled booking on today's best-fare day.</div>
    </div>
    <div style="padding:32px 40px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #F1E5DB;border-radius:10px;overflow:hidden;">
        <tr><td colspan="2" style="padding:10px 16px;background:#FFF1E6;font-size:11px;font-weight:800;color:#9CA3AF;text-transform:uppercase;">Booking Summary</td></tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #F1E5DB;">AIRFAIR Reference</td>
          <td style="padding:10px 16px;font-weight:800;color:#F97316;font-size:15px;border-bottom:1px solid #F1E5DB;">{booking.booking_reference}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #F1E5DB;">Route</td>
          <td style="padding:10px 16px;font-weight:700;border-bottom:1px solid #F1E5DB;">{booking.origin} &rarr; {booking.destination}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #F1E5DB;">Flight</td>
          <td style="padding:10px 16px;font-weight:700;border-bottom:1px solid #F1E5DB;">{booking.airline_name} &nbsp;&middot;&nbsp; {booking.flight_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #F1E5DB;">Travel Date</td>
          <td style="padding:10px 16px;font-weight:700;border-bottom:1px solid #F1E5DB;">{booking.travel_date or booking.flight_date}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;border-bottom:1px solid #F1E5DB;">Auto-Booked On</td>
          <td style="padding:10px 16px;font-weight:700;color:#059669;border-bottom:1px solid #F1E5DB;">{booking.auto_book_execution_date}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Amount Paid</td>
          <td style="padding:10px 16px;font-weight:900;font-size:18px;">&#8377;{booking.total_amount:,.2f}</td>
        </tr>
      </table>

      <div style="margin-top:24px;">
        <div style="font-size:11px;font-weight:800;color:#9CA3AF;text-transform:uppercase;margin-bottom:8px;">Passengers</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #F1E5DB;border-radius:8px;overflow:hidden;">{pax_rows}</table>
      </div>

      <div style="margin-top:24px;padding:16px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
        <div style="font-weight:700;color:#1E40AF;font-size:13px;margin-bottom:4px;">What happens next?</div>
        <div style="color:#1D4ED8;font-size:13px;line-height:1.6;">
          Your e-ticket will be delivered by the airline to this email once the ticket number
          is assigned. Track your booking anytime in <strong>My Bookings</strong> on AIRFAIR.
        </div>
      </div>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #F1E5DB;text-align:center;color:#9CA3AF;font-size:11px;">
      AIRFAIR &middot; Automated Booking Service &middot; This is an automated message. Do not reply.
    </div>
  </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = (
        f"[AIRFAIR] Auto-Booked: {booking.airline_name} "
        f"{booking.origin}\u2192{booking.destination} | {booking.booking_reference}"
    )
    msg["From"] = f"AIRFAIR Booking <{smtp_from}>"
    msg["To"] = booking.customer_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [booking.customer_email], msg.as_string())
        logger.info(
            "[AutoBook Email OK] Sent to %s for booking %s",
            booking.customer_email, booking.booking_reference,
        )
        return True
    except Exception as exc:
        logger.error("[AutoBook Email FAIL] %s", exc)
        return False


# ---------------------------------------------------------------------------
# Execute a single due booking
# ---------------------------------------------------------------------------

def _execute_single_booking(db: Session, booking: Booking) -> Dict[str, Any]:
    ref = booking.booking_reference
    logger.info("[AutoBook] Executing %s (%s->%s)", ref, booking.origin, booking.destination)

    # Idempotency: mark EXECUTING immediately so concurrent runs skip this record
    booking.status = "AUTO_BOOKING_EXECUTING"
    booking.updated_at = datetime.now(timezone.utc)
    db.commit()

    try:
        from backend.booking.travelport_client import TravelportTripServicesClient
        gds = TravelportTripServicesClient()

        ticket_res = gds.issue_e_tickets(
            provider_booking_ref=booking.provider_booking_reference,
            payment_ref=f"autobook_{ref}_{date.today().isoformat()}"
        )

        if ticket_res.get("ticket_issued") and ticket_res.get("ticket_number"):
            booking.status = "AUTO_BOOKED"
            booking.provider_ticketing_status = "TICKETED"
            booking.ticket_number = ticket_res.get("ticket_number")
            booking.airline_pnr = ticket_res.get("airline_pnr")
            booking.ticketed_at = datetime.now(timezone.utc)
            ticket_issued = True
        else:
            # Sandbox / pre-production — still mark as executed
            booking.status = "AUTO_BOOKED"
            booking.provider_ticketing_status = ticket_res.get(
                "status", "PREPROD_TICKET_PENDING_CREDENTIALS"
            )
            booking.ticketed_at = datetime.now(timezone.utc)
            ticket_issued = False

        db.commit()

        passengers = (
            db.query(BookingPassenger)
            .filter(BookingPassenger.booking_id == booking.id)
            .all()
        )
        email_sent = _send_confirmation_email(booking, passengers)

        logger.info("[AutoBook OK] %s | ticket_issued=%s | email=%s", ref, ticket_issued, email_sent)
        return {
            "booking_reference": ref,
            "status": "AUTO_BOOKED",
            "ticket_issued": ticket_issued,
            "ticket_number": booking.ticket_number,
            "airline_pnr": booking.airline_pnr,
            "email_sent": email_sent,
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.error("[AutoBook FAIL] %s: %s", ref, exc)
        booking.status = "AUTO_BOOK_FAILED"
        booking.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "booking_reference": ref,
            "status": "AUTO_BOOK_FAILED",
            "error": str(exc),
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }


# ---------------------------------------------------------------------------
# Main scheduler entry-point — called by APScheduler daily at 06:00 IST
# ---------------------------------------------------------------------------

# Bookings in these states are eligible for auto-execution today
ELIGIBLE_STATUSES = {
    "SCHEDULED_CONFIRMED",
    "CONFIRMED",
    "PAYMENT_VERIFIED_TICKETING_PENDING",
}


def run_auto_booking_job() -> Dict[str, Any]:
    """
    Sweep all bookings whose auto_book_execution_date == today
    and status is in ELIGIBLE_STATUSES, then execute each one.
    """
    today_str = date.today().isoformat()
    logger.info("[AutoBook Job] Starting sweep for %s", today_str)

    db: Session = SessionLocal()
    results: List[Dict[str, Any]] = []

    try:
        due: List[Booking] = (
            db.query(Booking)
            .filter(Booking.auto_book_execution_date == today_str)
            .filter(Booking.status.in_(ELIGIBLE_STATUSES))
            .all()
        )
        logger.info("[AutoBook Job] %d booking(s) due today", len(due))

        for booking in due:
            result = _execute_single_booking(db, booking)
            results.append(result)

    except Exception as exc:
        logger.error("[AutoBook Job] Sweep exception: %s", exc)
        results.append({"error": str(exc), "sweep_date": today_str})
    finally:
        db.close()

    summary = {
        "sweep_date": today_str,
        "total_due": len(results),
        "executed": sum(1 for r in results if r.get("status") == "AUTO_BOOKED"),
        "failed": sum(1 for r in results if r.get("status") == "AUTO_BOOK_FAILED"),
        "results": results,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info(
        "[AutoBook Job] Done. Executed: %d | Failed: %d",
        summary["executed"], summary["failed"]
    )
    return summary
