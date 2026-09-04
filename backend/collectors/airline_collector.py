import time
import os
from datetime import datetime, timezone
from typing import List, Dict, Any
from backend.collectors.base_collector import BaseCollector
from backend.config.sources import TEST_MODE
from backend.services.airfare_api_client import AirfareAPIClient


class AirlineCollector(BaseCollector):
    """
    Collector adapter connected to legitimate live flight-search APIs (SerpApi Google Flights / Kiwi / Skyscanner).
    Transfers actual commercial airfare results into the AIRFAIR normalization and ingestion pipeline.
    """

    def __init__(self):
        super().__init__(source_name="Live Airfare API Collector", source_type="AIRLINE", enabled=True)
        self.api_client = AirfareAPIClient()

    def collect(
        self,
        origin: str,
        destination: str,
        flight_date: str,
        advance_window: str = "T+7"
    ) -> List[Dict[str, Any]]:
        # Only use mock simulation if TEST_MODE is explicitly enabled
        if TEST_MODE:
            return self._simulate_airline_feed(origin, destination, flight_date, advance_window)

        # In REAL data mode: Query legitimate airfare API
        if not self.api_client.is_configured():
            raise ValueError(
                f"Airfare API credentials not configured. Please set AIRFARE_API_KEY in backend/.env for provider '{self.api_client.provider}'. "
                "Per system rules, mock fallback is disabled when DATA_SOURCE_MODE=REAL."
            )

        try:
            real_quotes = self.api_client.search_flights(
                origin=origin,
                destination=destination,
                flight_date=flight_date,
                cabin_class="ECONOMY"
            )
            for q in real_quotes:
                q["advance_purchase_window"] = advance_window
            return real_quotes

        except Exception as exc:
            # Per Rule 23: Do NOT silently generate mock data when real API fails.
            print(f"[AirlineCollector] Error executing real flight search: {exc}")
            raise exc

    def _simulate_airline_feed(self, origin: str, destination: str, flight_date: str, advance_window: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        return [
            {
                "airline_raw": "IndiGo Airlines",
                "airline_code": "6E",
                "origin_raw": origin,
                "destination_raw": destination,
                "flight_date": flight_date,
                "search_date": now_iso[:10],
                "scraped_at": now_iso,
                "advance_purchase_window": advance_window,
                "fare_class_raw": "ECONOMY",
                "base_fare_raw": "₹5,450",
                "taxes_raw": "654",
                "udf_raw": "150",
                "convenience_fee_raw": "250",
                "total_fare_raw": "₹6,504",
                "currency_raw": "INR",
                "source": "MOCK",
                "source_url": "https://www.goindigo.in/flight-booking",
                "availability_status": "AVAILABLE"
            },
            {
                "airline_raw": "Air India",
                "airline_code": "AI",
                "origin_raw": origin,
                "destination_raw": destination,
                "flight_date": flight_date,
                "search_date": now_iso[:10],
                "scraped_at": now_iso,
                "advance_purchase_window": advance_window,
                "fare_class_raw": "ECONOMY",
                "base_fare_raw": "₹6,400",
                "taxes_raw": "768",
                "udf_raw": "150",
                "convenience_fee_raw": "250",
                "total_fare_raw": "₹7,568",
                "currency_raw": "INR",
                "source": "MOCK",
                "source_url": "https://www.airindia.com/flights",
                "availability_status": "AVAILABLE"
            }
        ]
