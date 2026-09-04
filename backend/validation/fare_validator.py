from datetime import datetime
from typing import Dict, Any, Tuple, Optional
from backend.config.sources import VALID_ADVANCE_WINDOWS, VALID_FARE_CLASSES, VALID_AVAILABILITY


class FareValidator:
    """
    Validates normalized fare records against integrity constraints,
    mathematical consistency, and Indian aviation data standards.
    """

    @staticmethod
    def validate(record: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        if not record or not isinstance(record, dict):
            return False, "Record is empty or invalid data type"

        # 1. Origin & Destination Validity
        origin = record.get("route_origin")
        destination = record.get("route_destination")
        if not origin or len(origin) != 3 or not origin.isalpha():
            return False, f"Invalid origin IATA code: '{origin}'"
        if not destination or len(destination) != 3 or not destination.isalpha():
            return False, f"Invalid destination IATA code: '{destination}'"
        if origin == destination:
            return False, f"Origin and destination cannot be identical ({origin} -> {destination})"

        # 2. Airline Validity
        airline_code = record.get("airline_code")
        if not airline_code or len(airline_code) < 2:
            return False, f"Invalid airline code: '{airline_code}'"

        # 3. Flight Date Validity
        flight_date_str = record.get("flight_date")
        if not flight_date_str:
            return False, "Missing flight date"
        try:
            datetime.strptime(str(flight_date_str)[:10], "%Y-%m-%d")
        except ValueError:
            return False, f"Invalid flight date format: '{flight_date_str}' (expected YYYY-MM-DD)"

        # 4. Advance Purchase Window
        adv_win = record.get("advance_purchase_window")
        if adv_win not in VALID_ADVANCE_WINDOWS:
            return False, f"Invalid advance purchase window '{adv_win}'"

        # 5. Positive Fare Values
        base_fare = record.get("base_fare")
        total_fare = record.get("total_fare")
        if base_fare is None or base_fare < 0:
            return False, f"Base fare must be non-negative: {base_fare}"
        if total_fare is None or total_fare <= 0:
            return False, f"Total fare must be strictly positive: {total_fare}"

        taxes = record.get("taxes", 0.0) or 0.0
        udf = record.get("user_development_fee", 0.0) or 0.0
        convenience = record.get("convenience_fee", 0.0) or 0.0

        if taxes < 0 or udf < 0 or convenience < 0:
            return False, "Fare breakdown fees cannot be negative"

        # 6. Total Fare Consistency Check:
        # total_fare = base_fare + taxes + user_development_fee + convenience_fee
        expected_total = round(base_fare + taxes + udf + convenience, 2)
        actual_total = round(total_fare, 2)
        if abs(expected_total - actual_total) > 0.10:
            return False, (
                f"Fare consistency failed: total_fare ({actual_total}) != "
                f"base ({base_fare}) + taxes ({taxes}) + udf ({udf}) + convenience ({convenience}) = {expected_total}"
            )

        # 7. Currency
        currency = record.get("currency")
        if currency != "INR":
            return False, f"Currency must be 'INR', received '{currency}'"

        # 8. Fare Class
        fclass = record.get("fare_class")
        if fclass not in VALID_FARE_CLASSES:
            return False, f"Invalid fare class '{fclass}'"

        # 9. Availability Status
        status = record.get("availability_status")
        if status not in VALID_AVAILABILITY:
            return False, f"Invalid availability status '{status}'"

        return True, None
