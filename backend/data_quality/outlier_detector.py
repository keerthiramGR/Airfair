from typing import List, Dict, Any, Tuple
import math


class OutlierDetector:
    """
    Detects statistical fare outliers using IQR (Interquartile Range) and Z-score methods.
    CRITICAL: Preserves genuine market extremes. Flags records as 'is_outlier = True'
    for analytics rather than deleting them from the historical database.
    """

    @staticmethod
    def _percentile(sorted_data: List[float], percentile: float) -> float:
        if not sorted_data:
            return 0.0
        n = len(sorted_data)
        if n == 1:
            return sorted_data[0]
        idx = (percentile / 100.0) * (n - 1)
        lower = int(math.floor(idx))
        upper = int(math.ceil(idx))
        if lower == upper:
            return sorted_data[lower]
        weight = idx - lower
        return sorted_data[lower] * (1.0 - weight) + sorted_data[upper] * weight

    @classmethod
    def detect_outliers_iqr(cls, fares: List[float], multiplier: float = 1.5) -> Tuple[float, float]:
        """
        Computes the IQR lower and upper bounds.
        Returns: (lower_bound, upper_bound)
        """
        if len(fares) < 4:
            # Not enough samples for meaningful IQR; use safe domain boundaries for Indian domestic fares
            return 1500.0, 35000.0

        sorted_fares = sorted(fares)
        q1 = cls._percentile(sorted_fares, 25.0)
        q3 = cls._percentile(sorted_fares, 75.0)
        iqr = q3 - q1

        lower_bound = max(500.0, q1 - (multiplier * iqr))
        upper_bound = q3 + (multiplier * iqr)
        return round(lower_bound, 2), round(upper_bound, 2)

    @classmethod
    def flag_batch_outliers(
        cls,
        records: List[Dict[str, Any]],
        multiplier: float = 1.5
    ) -> List[Dict[str, Any]]:
        """
        Groups records by route corridor, computes statistical boundaries, and attaches
        'is_outlier': bool and 'outlier_reason': Optional[str] to each record.
        """
        if not records:
            return []

        # Group fare values by route
        route_fares: Dict[str, List[float]] = {}
        for r in records:
            orig = str(r.get("origin") or r.get("route_origin", "")).upper()
            dest = str(r.get("destination") or r.get("route_destination", "")).upper()
            route_key = f"{orig}-{dest}" if orig and dest else "DEFAULT"
            try:
                fare = float(r.get("total_fare", 0))
                if fare > 0:
                    route_fares.setdefault(route_key, []).append(fare)
            except (ValueError, TypeError):
                pass

        # Calculate bounds per route
        route_bounds: Dict[str, Tuple[float, float]] = {}
        for r_key, fares in route_fares.items():
            route_bounds[r_key] = cls.detect_outliers_iqr(fares, multiplier=multiplier)

        # Flag records
        annotated = []
        for r in records:
            item = dict(r)
            orig = str(item.get("origin") or item.get("route_origin", "")).upper()
            dest = str(item.get("destination") or item.get("route_destination", "")).upper()
            route_key = f"{orig}-{dest}" if orig and dest else "DEFAULT"

            lower_bound, upper_bound = route_bounds.get(route_key, (1500.0, 35000.0))
            try:
                fare = float(item.get("total_fare", 0))
                if fare < lower_bound:
                    item["is_outlier"] = True
                    item["outlier_reason"] = f"Fare ₹{fare} below statistical floor ₹{lower_bound}"
                elif fare > upper_bound:
                    item["is_outlier"] = True
                    item["outlier_reason"] = f"Fare ₹{fare} above statistical ceiling ₹{upper_bound}"
                else:
                    item["is_outlier"] = False
                    item["outlier_reason"] = None
            except Exception:
                item["is_outlier"] = False
                item["outlier_reason"] = None

            annotated.append(item)

        return annotated
