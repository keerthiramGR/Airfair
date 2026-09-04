from typing import List, Optional, Dict, Any
import statistics


class BaselineService:
    """
    Computes statistical reference baseline fares from cleaned historical observations.
    Uses median aggregation to ensure robust baseline calibration against market anomalies.
    Enforces minimum sample thresholds without fabricating synthetic baselines.
    """

    DEFAULT_MIN_OBSERVATIONS = 3

    @staticmethod
    def calculate_baseline(
        fares: List[float],
        min_observations: int = DEFAULT_MIN_OBSERVATIONS
    ) -> Optional[float]:
        """
        Calculates the median baseline fare from a list of clean historical fare values.
        Returns None if fewer than min_observations exist.
        """
        valid_fares = [float(f) for f in fares if f is not None and float(f) > 0]
        if len(valid_fares) < min_observations:
            return None

        median_val = statistics.median(valid_fares)
        return round(float(median_val), 2)
