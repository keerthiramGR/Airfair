from typing import Optional, Dict, Any, List, Tuple


class IndexCalculator:
    """
    Core mathematical engine for computing the AIRFAIR Price Index,
    data coverage percentages, and statistical reliability levels.
    """

    @staticmethod
    def calculate_index(current_fare: float, baseline_fare: Optional[float]) -> Optional[float]:
        """
        Formula: Index = (Current / Baseline) * 100
        """
        if baseline_fare is None or baseline_fare <= 0 or current_fare <= 0:
            return None
        index_val = (current_fare / baseline_fare) * 100.0
        return round(index_val, 2)

    @staticmethod
    def calculate_coverage(available_days: int, requested_days: int) -> float:
        """
        Coverage percentage: (available_days / requested_days) * 100
        """
        if requested_days <= 0:
            return 0.0
        pct = (available_days / requested_days) * 100.0
        return round(min(100.0, max(0.0, pct)), 2)

    @staticmethod
    def determine_reliability(
        available_days: int,
        total_observations: int,
        coverage_pct: float
    ) -> str:
        """
        Determines transparent reliability categorization:
        - INSUFFICIENT: fewer than 3 observed dates or < 3 observations
        - LOW: 3-6 observed dates or < 25% coverage
        - MEDIUM: 7-19 observed dates or 25%-69% coverage
        - HIGH: 20+ observed dates or >= 70% coverage
        """
        if available_days < 3 or total_observations < 3:
            return "INSUFFICIENT"
        elif available_days >= 20 or coverage_pct >= 70.0:
            return "HIGH"
        elif available_days >= 7 or coverage_pct >= 25.0:
            return "MEDIUM"
        else:
            return "LOW"
