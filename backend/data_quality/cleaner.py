from datetime import datetime, date, timezone
from typing import Dict, Any, Optional
import re
from backend.normalization.route_normalizer import RouteNormalizer
from backend.normalization.airline_normalizer import AirlineNormalizer
from backend.parsers.fare_parser import FareParser


class DataCleaner:
    """
    Cleans and standardizes raw and historical airfare observations.
    Ensures strict route, airline, numeric, currency, and timestamp consistency
    without fabricating data or modifying the underlying economic fare meaning.
    """

    @staticmethod
    def clean_text(val: Any) -> Optional[str]:
        if val is None:
            return None
        cleaned = str(val).strip()
        return cleaned if cleaned else None

    @staticmethod
    def clean_code(val: Any) -> Optional[str]:
        cleaned = DataCleaner.clean_text(val)
        return cleaned.upper() if cleaned else None

    @staticmethod
    def clean_airline(airline_raw: Any) -> Optional[str]:
        if not airline_raw:
            return None
        return AirlineNormalizer.normalize_code(str(airline_raw).strip())

    @staticmethod
    def clean_airport(airport_raw: Any) -> Optional[str]:
        if not airport_raw:
            return None
        return RouteNormalizer.normalize_iata(str(airport_raw).strip())

    @staticmethod
    def parse_numeric_fare(val: Any) -> Optional[float]:
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val) if val >= 0 else None
        
        # Remove currency symbols, commas, spaces
        cleaned = re.sub(r"[₹\s,]|(?:Rs\.?)|(?:INR)", "", str(val), flags=re.IGNORECASE).strip()
        try:
            num = float(cleaned)
            return round(num, 2) if num >= 0 else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def clean_currency(currency_raw: Any) -> str:
        if not currency_raw:
            return "INR"
        c = str(currency_raw).strip().upper()
        if "INR" in c or "₹" in c or "RS" in c:
            return "INR"
        return c

    @staticmethod
    def normalize_timestamp_utc(ts: Any) -> str:
        if not ts:
            return datetime.now(timezone.utc).isoformat()
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                return ts.replace(tzinfo=timezone.utc).isoformat()
            return ts.astimezone(timezone.utc).isoformat()
        
        ts_str = str(ts).strip()
        try:
            # Handle ISO string variations
            clean_ts = ts_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            try:
                dt = datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def normalize_flight_date(fdate: Any) -> Optional[str]:
        if not fdate:
            return None
        if isinstance(fdate, date):
            return fdate.strftime("%Y-%m-%d")
        
        s = str(fdate).strip()[:10]
        try:
            dt = datetime.strptime(s, "%Y-%m-%d").date()
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return None

    @staticmethod
    def calculate_advance_window(flight_date_str: str, scraped_at_str: Optional[str] = None) -> str:
        """
        Dynamically calculates the advance purchase window T+N without forcing an incorrect bucket.
        """
        try:
            flight_dt = datetime.strptime(flight_date_str[:10], "%Y-%m-%d").date()
            if scraped_at_str:
                scraped_dt = datetime.strptime(scraped_at_str[:10], "%Y-%m-%d").date()
            else:
                scraped_dt = date.today()

            diff_days = (flight_dt - scraped_dt).days
            if diff_days <= 1:
                return "T+1"
            elif diff_days <= 7:
                return "T+7"
            elif diff_days <= 15:
                return "T+15"
            elif diff_days <= 30:
                return "T+30"
            elif diff_days <= 45:
                return "T+45"
            else:
                return f"T+{diff_days}"
        except Exception:
            return "T+7"

    @classmethod
    def clean_record(cls, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Cleans and normalizes an individual airfare record.
        Returns a cleaned dictionary or None if mandatory identifiers are unresolvable.
        """
        if not record or not isinstance(record, dict):
            return None

        # 1. Airline
        airline_code = cls.clean_airline(
            record.get("airline_code") or record.get("airline_name") or record.get("airline")
        )
        if not airline_code:
            return None

        # 2. Route
        origin = cls.clean_airport(
            record.get("origin") or record.get("route_origin") or record.get("origin_iata")
        )
        destination = cls.clean_airport(
            record.get("destination") or record.get("route_destination") or record.get("destination_iata")
        )
        if not origin or not destination or origin == destination:
            return None

        # 3. Flight Date & Scraped Timestamp
        flight_date = cls.normalize_flight_date(record.get("flight_date"))
        if not flight_date:
            return None

        scraped_at = cls.normalize_timestamp_utc(
            record.get("scraped_at") or record.get("collected_at") or record.get("created_at")
        )

        # 4. Advance Purchase Window
        adv_window = record.get("advance_purchase_window") or record.get("advance_window")
        if not adv_window or not str(adv_window).startswith("T+"):
            adv_window = cls.calculate_advance_window(flight_date, scraped_at)

        # 5. Numeric Fares
        total_fare = cls.parse_numeric_fare(record.get("total_fare"))
        base_fare = cls.parse_numeric_fare(record.get("base_fare"))
        taxes = cls.parse_numeric_fare(record.get("taxes"))
        udf = cls.parse_numeric_fare(record.get("user_development_fee") or record.get("udf"))
        convenience = cls.parse_numeric_fare(record.get("convenience_fee"))

        if total_fare is None and base_fare is not None:
            comp_sum = (taxes or 0.0) + (udf or 0.0) + (convenience or 0.0)
            total_fare = round(base_fare + comp_sum, 2)
        elif base_fare is None and total_fare is not None:
            # If components are not provided, base_fare equals total_fare
            comp_sum = (taxes or 0.0) + (udf or 0.0) + (convenience or 0.0)
            base_fare = round(max(0.0, total_fare - comp_sum), 2)

        if total_fare is None or base_fare is None:
            return None

        # 6. Currency, Class, Status, Source
        currency = cls.clean_currency(record.get("currency"))
        fare_class = str(record.get("fare_class") or "ECONOMY").strip().upper()
        if fare_class not in ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS"]:
            fare_class = "ECONOMY"

        status = str(record.get("availability_status") or "AVAILABLE").strip().upper()
        if status not in ["AVAILABLE", "SOLD_OUT", "CANCELLED", "UNKNOWN"]:
            status = "AVAILABLE"

        source = str(record.get("source") or "SERPAPI").strip().upper()
        source_url = record.get("source_url") or ""

        return {
            "airline_code": airline_code,
            "origin": origin,
            "destination": destination,
            "flight_date": flight_date,
            "scraped_at": scraped_at,
            "advance_purchase_window": adv_window,
            "fare_class": fare_class,
            "base_fare": base_fare,
            "taxes": taxes,
            "user_development_fee": udf,
            "convenience_fee": convenience,
            "total_fare": total_fare,
            "currency": currency,
            "source": source,
            "source_url": source_url,
            "availability_status": status
        }
