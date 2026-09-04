from typing import Dict, Any, Tuple, List, Optional
from datetime import datetime


class QualityChecker:
    """
    Evaluates individual airfare records and collection batches against
    institutional data quality standards and calculates transparent quality scores.
    """

    @staticmethod
    def get_quality_category(score: float) -> str:
        if score >= 90.0:
            return "Excellent"
        elif score >= 75.0:
            return "Good"
        elif score >= 50.0:
            return "Needs Review"
        else:
            return "Poor"

    @classmethod
    def evaluate_record(cls, record: Dict[str, Any]) -> Tuple[bool, float, str, List[str]]:
        """
        Evaluates an individual record.
        Returns:
            (is_valid: bool, quality_score: float, category: str, issues: List[str])
        """
        if not record or not isinstance(record, dict):
            return False, 0.0, "Poor", ["Record is empty or not a valid dictionary"]

        score = 0.0
        issues = []
        is_valid = True

        # 1. Mandatory Identifiers (30 points)
        has_airline = bool(record.get("airline_code"))
        has_origin = bool(record.get("origin") or record.get("route_origin"))
        has_dest = bool(record.get("destination") or record.get("route_destination"))
        has_fdate = bool(record.get("flight_date"))
        has_fare = record.get("total_fare") is not None

        if has_airline and has_origin and has_dest and has_fdate and has_fare:
            score += 30.0
        else:
            missing = []
            if not has_airline: missing.append("airline")
            if not has_origin: missing.append("origin")
            if not has_dest: missing.append("destination")
            if not has_fdate: missing.append("flight_date")
            if not has_fare: missing.append("total_fare")
            issues.append(f"Missing mandatory fields: {', '.join(missing)}")
            is_valid = False

        # 2. Valid Route (20 points)
        origin = str(record.get("origin") or record.get("route_origin") or "").strip().upper()
        dest = str(record.get("destination") or record.get("route_destination") or "").strip().upper()

        if len(origin) == 3 and origin.isalpha() and len(dest) == 3 and dest.isalpha():
            if origin != dest:
                score += 20.0
            else:
                issues.append(f"Origin and destination cannot be identical ({origin} -> {dest})")
                is_valid = False
        else:
            issues.append(f"Invalid route IATA codes: '{origin}' -> '{dest}'")
            is_valid = False

        # 3. Valid Airline (15 points)
        airline = str(record.get("airline_code") or "").strip().upper()
        if len(airline) == 2:
            score += 15.0
        else:
            issues.append(f"Invalid airline IATA code: '{airline}'")
            is_valid = False

        # 4. Valid Fare Value (15 points)
        try:
            total_fare = float(record.get("total_fare", 0))
            if total_fare >= 500.0:  # Realistic domestic minimum fare in INR
                score += 15.0
            elif total_fare > 0:
                score += 8.0
                issues.append(f"Unusually low fare value: ₹{total_fare}")
            else:
                issues.append(f"Non-positive fare value: ₹{total_fare}")
                is_valid = False
        except (ValueError, TypeError):
            issues.append("Non-numeric total fare")
            is_valid = False

        # 5. Fare Breakdown Consistency (10 points)
        base_fare = record.get("base_fare")
        taxes = record.get("taxes")
        udf = record.get("user_development_fee") or record.get("udf")
        convenience = record.get("convenience_fee")

        if base_fare is not None and total_fare > 0:
            comp_sum = (taxes or 0.0) + (udf or 0.0) + (convenience or 0.0)
            expected_total = float(base_fare) + comp_sum
            diff = abs(expected_total - total_fare)
            if diff <= 1.0:  # Allow currency rounding
                score += 10.0
            else:
                score += 4.0
                issues.append(f"Breakdown discrepancy: total ({total_fare}) vs components sum ({expected_total})")
        else:
            # Breakdown missing but total is valid
            score += 7.0

        # 6. Currency, Timezone & Status (10 points)
        curr = str(record.get("currency") or "INR").upper()
        if curr == "INR":
            score += 5.0
        else:
            issues.append(f"Non-INR currency: '{curr}'")

        scraped_at = record.get("scraped_at") or record.get("collected_at")
        if scraped_at:
            score += 5.0
        else:
            issues.append("Missing scrape timestamp")

        final_score = round(min(100.0, max(0.0, score)), 2)
        category = cls.get_quality_category(final_score)

        return is_valid, final_score, category, issues
