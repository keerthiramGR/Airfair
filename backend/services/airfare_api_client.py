import os
import re
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables from backend/.env are loaded
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env", override=False)

# Provider constants
PROVIDER_SERPAPI = "SERPAPI"
PROVIDER_SKYSCANNER = "SKYSCANNER"
PROVIDER_KIWI = "KIWI"


class AirfareAPIClient:
    """
    Dedicated HTTP client for legitimate commercial flight-search APIs.
    Communicates strictly server-side with zero exposure of API credentials.
    Supports SerpApi (Google Flights), RapidAPI Skyscanner, and Kiwi Tequila.
    """

    def __init__(self):
        # Reload env in case it was modified at runtime
        load_dotenv(_backend_dir / ".env", override=False)
        self.api_key = os.getenv("AIRFARE_API_KEY", "").strip()
        self.provider = os.getenv("AIRFARE_API_PROVIDER", PROVIDER_SERPAPI).strip().upper()
        self.base_url = os.getenv("AIRFARE_API_BASE_URL", "").strip()
        self.enabled = os.getenv("AIRFARE_API_ENABLED", "true").lower() in ("true", "1", "yes")

        # Default endpoints per provider
        if not self.base_url:
            if self.provider == PROVIDER_SERPAPI:
                self.base_url = "https://serpapi.com/search.json"
            elif self.provider == PROVIDER_KIWI:
                self.base_url = "https://api.tequila.kiwi.com/v2/search"
            elif self.provider == PROVIDER_SKYSCANNER:
                self.base_url = "https://skyscanner44.p.rapidapi.com/search"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.enabled)

    def search_flights(
        self,
        origin: str,
        destination: str,
        flight_date: str,
        passengers: int = 1,
        cabin_class: str = "ECONOMY"
    ) -> List[Dict[str, Any]]:
        """
        Queries the configured legitimate flight search API and returns standardized raw quote dictionaries.
        Raises descriptive exceptions on authentication failure, quota exhaustion, or connectivity error.
        """
        if not self.api_key:
            raise ValueError(
                f"Airfare API credentials not configured. Please set AIRFARE_API_KEY in backend/.env for provider '{self.provider}'."
            )

        if not self.enabled:
            raise ValueError("Airfare API integration is currently disabled (AIRFARE_API_ENABLED=false).")

        if self.provider == PROVIDER_SERPAPI:
            return self._query_serpapi(origin, destination, flight_date, passengers, cabin_class)
        elif self.provider == PROVIDER_KIWI:
            return self._query_kiwi(origin, destination, flight_date, passengers, cabin_class)
        elif self.provider == PROVIDER_SKYSCANNER:
            return self._query_skyscanner(origin, destination, flight_date, passengers, cabin_class)
        else:
            raise ValueError(f"Unsupported AIRFARE_API_PROVIDER: '{self.provider}'")

    def _query_serpapi(
        self,
        origin: str,
        destination: str,
        flight_date: str,
        passengers: int,
        cabin_class: str
    ) -> List[Dict[str, Any]]:
        """
        Queries Google Flights via SerpApi official engine.
        Docs: https://serpapi.com/google-flights-api
        """
        cabin_map = {
            "ECONOMY": "1",
            "PREMIUM_ECONOMY": "2",
            "BUSINESS": "3",
            "FIRST": "4"
        }
        travel_class = cabin_map.get(cabin_class.upper(), "1")

        params = {
            "engine": "google_flights",
            "departure_id": origin.upper(),
            "arrival_id": destination.upper(),
            "outbound_date": str(flight_date)[:10],
            "type": "2",  # 2 = One way flight search
            "adults": passengers,
            "travel_class": travel_class,
            "currency": "INR",
            "hl": "en",
            "api_key": self.api_key
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(self.base_url, params=params)

            if resp.status_code == 401 or resp.status_code == 403:
                raise PermissionError(
                    f"Authentication failed for SerpApi (HTTP {resp.status_code}). Verify AIRFARE_API_KEY."
                )
            elif resp.status_code == 429:
                raise RuntimeError("SerpApi rate limit or monthly quota exceeded (HTTP 429).")
            elif resp.status_code >= 500:
                raise ConnectionError(f"SerpApi remote server error (HTTP {resp.status_code}).")

            resp.raise_for_status()
            data = resp.json()
            return self._parse_serpapi_response(data, origin, destination, flight_date, cabin_class)

        except httpx.TimeoutException:
            raise TimeoutError("SerpApi request timed out after 15 seconds.")
        except httpx.RequestError as exc:
            raise ConnectionError(f"Network error reaching SerpApi: {str(exc)}")

    def _parse_serpapi_response(
        self,
        data: Dict[str, Any],
        origin: str,
        destination: str,
        flight_date: str,
        cabin_class: str
    ) -> List[Dict[str, Any]]:
        raw_quotes = []
        flight_groups = data.get("best_flights", []) + data.get("other_flights", [])
        now_iso = datetime.now(timezone.utc).isoformat()
        search_url = data.get("search_metadata", {}).get("google_flights_url", "")

        for item in flight_groups:
            price = item.get("price")
            if price is None:
                continue

            # Extract airline from primary flight leg
            flights = item.get("flights", [])
            primary_flight = flights[0] if flights else {}
            airline_name = primary_flight.get("airline", "Indian Commercial Airline")
            flight_number = primary_flight.get("flight_number", "")

            # Mathematical fee breakdown (standard Indian domestic taxation)
            total_fare = float(price)
            # Standard ratio: ~80% base, ~12% GST/taxes, ~150 UDF, ~250 convenience
            if total_fare > 1000:
                base_fare = round(total_fare * 0.82, 2)
                taxes = round(total_fare * 0.12, 2)
                udf = 150.0
                convenience = round(total_fare - (base_fare + taxes + udf), 2)
                if convenience < 0:
                    convenience = 0.0
                    base_fare = round(total_fare - (taxes + udf), 2)
            else:
                base_fare = total_fare
                taxes = 0.0
                udf = 0.0
                convenience = 0.0

            raw_quotes.append({
                "airline_raw": airline_name,
                "airline_code": airline_name,
                "origin_raw": origin,
                "destination_raw": destination,
                "flight_date": flight_date,
                "scraped_at": now_iso,
                "fare_class_raw": cabin_class,
                "base_fare_raw": str(base_fare),
                "taxes_raw": str(taxes),
                "udf_raw": str(udf),
                "convenience_fee_raw": str(convenience),
                "total_fare_raw": str(total_fare),
                "currency_raw": "INR",
                "source": PROVIDER_SERPAPI,
                "source_url": search_url or f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{flight_date}",
                "availability_status": "AVAILABLE"
            })

        return raw_quotes

    def _query_kiwi(self, origin: str, destination: str, flight_date: str, passengers: int, cabin_class: str):
        # Format date for Kiwi DD/MM/YYYY
        dt = datetime.strptime(str(flight_date)[:10], "%Y-%m-%d")
        kiwi_date = dt.strftime("%d/%m/%Y")
        headers = {"apikey": self.api_key}
        params = {
            "fly_from": origin.upper(),
            "fly_to": destination.upper(),
            "date_from": kiwi_date,
            "date_to": kiwi_date,
            "curr": "INR",
            "adults": passengers,
            "selected_cabins": "M" if cabin_class == "ECONOMY" else "C"
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(self.base_url, headers=headers, params=params)
        if resp.status_code in (401, 403):
            raise PermissionError("Authentication failed for Kiwi Tequila API. Verify AIRFARE_API_KEY.")
        resp.raise_for_status()
        data = resp.json()
        
        now_iso = datetime.now(timezone.utc).isoformat()
        raw_quotes = []
        for item in data.get("data", []):
            total_fare = float(item.get("price", 0.0))
            if total_fare <= 0:
                continue
            carriers = item.get("airlines", [])
            airline_code = carriers[0] if carriers else "AI"
            base_fare = round(total_fare * 0.85, 2)
            taxes = round(total_fare * 0.10, 2)
            udf = 100.0
            convenience = round(total_fare - (base_fare + taxes + udf), 2)

            raw_quotes.append({
                "airline_raw": airline_code,
                "airline_code": airline_code,
                "origin_raw": origin,
                "destination_raw": destination,
                "flight_date": flight_date,
                "scraped_at": now_iso,
                "fare_class_raw": cabin_class,
                "base_fare_raw": str(base_fare),
                "taxes_raw": str(taxes),
                "udf_raw": str(udf),
                "convenience_fee_raw": str(convenience),
                "total_fare_raw": str(total_fare),
                "currency_raw": "INR",
                "source": PROVIDER_KIWI,
                "source_url": item.get("deep_link", ""),
                "availability_status": "AVAILABLE"
            })
        return raw_quotes

    def _query_skyscanner(self, origin: str, destination: str, flight_date: str, passengers: int, cabin_class: str):
        headers = {
            "x-rapidapi-key": self.api_key,
            "x-rapidapi-host": "skyscanner44.p.rapidapi.com"
        }
        params = {
            "adults": passengers,
            "origin": origin.upper(),
            "destination": destination.upper(),
            "departureDate": str(flight_date)[:10],
            "currency": "INR"
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(self.base_url, headers=headers, params=params)
        if resp.status_code in (401, 403):
            raise PermissionError("Authentication failed for RapidAPI Skyscanner. Verify AIRFARE_API_KEY.")
        resp.raise_for_status()
        data = resp.json()
        
        now_iso = datetime.now(timezone.utc).isoformat()
        raw_quotes = []
        itineraries = data.get("itineraries", {}).get("results", [])
        for item in itineraries:
            price_val = item.get("pricingOptions", [{}])[0].get("price", {}).get("amount")
            if not price_val:
                continue
            total_fare = float(price_val)
            legs = item.get("legs", [{}])
            carrier = legs[0].get("carriers", {}).get("marketing", [{}])[0].get("name", "Airline")
            base_fare = round(total_fare * 0.85, 2)
            taxes = round(total_fare * 0.10, 2)
            udf = 100.0
            convenience = round(total_fare - (base_fare + taxes + udf), 2)

            raw_quotes.append({
                "airline_raw": carrier,
                "airline_code": carrier,
                "origin_raw": origin,
                "destination_raw": destination,
                "flight_date": flight_date,
                "scraped_at": now_iso,
                "fare_class_raw": cabin_class,
                "base_fare_raw": str(base_fare),
                "taxes_raw": str(taxes),
                "udf_raw": str(udf),
                "convenience_fee_raw": str(convenience),
                "total_fare_raw": str(total_fare),
                "currency_raw": "INR",
                "source": PROVIDER_SKYSCANNER,
                "source_url": "https://www.skyscanner.co.in",
                "availability_status": "AVAILABLE"
            })
        return raw_quotes
