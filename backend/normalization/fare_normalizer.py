from datetime import datetime, date
from typing import Dict, Any, Optional
from backend.parsers.fare_parser import FareParser
from backend.normalization.route_normalizer import RouteNormalizer
from backend.normalization.airline_normalizer import AirlineNormalizer


class FareNormalizer:
    """
    Transforms raw source quotes into the standardized AIRFAIR fare format.
    Calculates dynamic advance purchase windows (T+1, T+7, T+15, T+30, T+45).
    """

    @staticmethod
    def calculate_advance_window(flight_date_str: str, search_date_str: Optional[str] = None) -> str:
        try:
            flight_dt = datetime.strptime(flight_date_str[:10], "%Y-%m-%d").date()
            if search_date_str:
                search_dt = datetime.strptime(search_date_str[:10], "%Y-%m-%d").date()
            else:
                search_dt = date.today()

            diff_days = (flight_dt - search_dt).days

            if diff_days <= 1:
                return "T+1"
            elif diff_days <= 3:
                return "T+3"
            elif diff_days <= 7:
                return "T+7"
            elif diff_days <= 15:
                return "T+15"
            elif diff_days <= 30:
                return "T+30"
            else:
                return "T+45"
        except Exception:
            return "T+7"

    @staticmethod
    def normalize_record(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transforms raw extracted collector dictionary into standard AIRFAIR quote format.
        """
        if not raw:
            return None

        # 1. Normalize Airline
        airline_code = AirlineNormalizer.normalize_code(
            raw.get("airline_code") or raw.get("airline_raw") or ""
        )
        if not airline_code:
            return None

        # 2. Normalize Route
        origin = RouteNormalizer.normalize_iata(raw.get("origin_raw") or raw.get("origin") or "")
        destination = RouteNormalizer.normalize_iata(raw.get("destination_raw") or raw.get("destination") or "")
        if not origin or not destination or origin == destination:
            return None

        # 3. Flight Date & Advance Window
        flight_date = str(raw.get("flight_date", ""))[:10]
        search_date = str(raw.get("search_date", ""))[:10] or str(raw.get("scraped_at", ""))[:10]

        advance_window = raw.get("advance_purchase_window")
        if not advance_window or advance_window not in ["T+1", "T+3", "T+7", "T+15", "T+30", "T+45"]:
            advance_window = FareNormalizer.calculate_advance_window(flight_date, search_date)

        # 4. Scraped Timestamp
        scraped_at = raw.get("scraped_at")
        if not scraped_at:
            from datetime import timezone
            scraped_at = datetime.now(timezone.utc).isoformat()


        # 5. Parse Numeric Amounts
        base_fare = FareParser.parse_amount(raw.get("base_fare_raw") or raw.get("base_fare"))
        taxes = FareParser.parse_amount(raw.get("taxes_raw") or raw.get("taxes")) or 0.0
        udf = FareParser.parse_amount(raw.get("udf_raw") or raw.get("user_development_fee")) or 0.0
        convenience = FareParser.parse_amount(raw.get("convenience_fee_raw") or raw.get("convenience_fee")) or 0.0
        total_fare = FareParser.parse_amount(raw.get("total_fare_raw") or raw.get("total_fare"))

        # If total_fare is present but base_fare is missing or vice-versa
        if total_fare is None and base_fare is not None:
            total_fare = base_fare + taxes + udf + convenience
        elif base_fare is None and total_fare is not None:
            # Back-calculate base if components are missing
            base_fare = max(0.0, total_fare - (taxes + udf + convenience))

        if total_fare is None or base_fare is None:
            return None

        # 6. Currency, Class, Status
        currency = FareParser.parse_currency(raw.get("currency_raw") or raw.get("currency"))
        fare_class = str(raw.get("fare_class_raw") or raw.get("fare_class") or "ECONOMY").upper()
        if fare_class not in ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS"]:
            fare_class = "ECONOMY"

        status = str(raw.get("availability_status") or "AVAILABLE").upper()
        if status not in ["AVAILABLE", "SOLD_OUT", "CANCELLED", "UNKNOWN"]:
            status = "AVAILABLE"

        source = str(raw.get("source") or "AIRLINE").upper()
        source_url = raw.get("source_url") or ""

        return {
            "airline_code": airline_code,
            "route_origin": origin,
            "route_destination": destination,
            "flight_date": flight_date,
            "scraped_at": scraped_at,
            "advance_purchase_window": advance_window,
            "fare_class": fare_class,
            "base_fare": round(float(base_fare), 2),
            "taxes": round(float(taxes), 2),
            "user_development_fee": round(float(udf), 2),
            "convenience_fee": round(float(convenience), 2),
            "total_fare": round(float(total_fare), 2),
            "currency": currency,
            "source": source,
            "source_url": source_url,
            "availability_status": status
        }
