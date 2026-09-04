from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import os
from backend.booking.travelport_client import TravelportTripServicesClient


class FlightBookingProvider(ABC):
    """
    Abstract interface for external flight booking providers (GDS, NDC, Airline Direct Connect).
    Enforces clean separation between internal booking state and external airline ticketing APIs.
    """

    @abstractmethod
    def check_live_fare_lock(self, quote_id: int, origin: str, destination: str, flight_date: str) -> Dict[str, Any]:
        """Verify seat availability and fare lock with airline before booking."""
        pass

    @abstractmethod
    def create_airline_pnr_hold(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """Place a reservation hold with the ticketing provider."""
        pass

    @abstractmethod
    def issue_e_ticket(self, booking_id: int, pnr: str, payment_ref: str) -> Dict[str, Any]:
        """Request e-ticket issuance upon successful payment."""
        pass

    @abstractmethod
    def cancel_pnr(self, pnr: str, reason: str) -> Dict[str, Any]:
        """Request PNR cancellation with airline/GDS."""
        pass


class TravelportBookingProvider(FlightBookingProvider):
    """
    Primary GDS Provider connector using Travelport TripServices (JSON REST API).
    """

    def __init__(self):
        self.client = TravelportTripServicesClient()

    def is_live_provider_connected(self) -> bool:
        return self.client.auth.is_configured()

    def check_live_fare_lock(self, quote_id: int, origin: str, destination: str, flight_date: str) -> Dict[str, Any]:
        return self.client.verify_and_reprice_offer(
            origin=origin,
            destination=destination,
            flight_date=flight_date,
            airline_code="6E",
            current_amount=0.0
        )

    def create_airline_pnr_hold(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.client.create_air_reservation(
            booking_ref=booking_data.get("booking_reference", ""),
            flight_details=booking_data.get("flight", {}),
            passengers=booking_data.get("passengers", [])
        )

    def issue_e_ticket(self, booking_id: int, pnr: str, payment_ref: str) -> Dict[str, Any]:
        return self.client.issue_e_tickets(
            provider_booking_ref=pnr,
            payment_ref=payment_ref
        )

    def cancel_pnr(self, pnr: str, reason: str) -> Dict[str, Any]:
        return self.client.cancel_reservation(
            provider_booking_ref=pnr,
            reason=reason
        )


# Backward compatibility alias
StandardAirBookingProvider = TravelportBookingProvider

