from typing import Optional, Tuple


class MovementService:
    """
    Calculates day-over-day price changes, observed market trajectories,
    and assigns AIRFAIR price interpretation bands.
    """

    DEFAULT_TOLERANCE_PCT = 1.0  # +/- 1% considered stable

    @classmethod
    def calculate_price_change(
        cls,
        current_fare: float,
        previous_fare: Optional[float],
        tolerance_pct: float = DEFAULT_TOLERANCE_PCT
    ) -> Tuple[float, str]:
        """
        Calculates percentage change vs previous observed date and determines movement direction.
        Returns (percentage_change: float, movement: str)
        """
        if previous_fare is None or previous_fare <= 0:
            return 0.0, "STABLE"

        pct_change = ((current_fare - previous_fare) / previous_fare) * 100.0
        pct_change_rounded = round(pct_change, 2)

        if pct_change_rounded > tolerance_pct:
            movement = "INCREASING"
        elif pct_change_rounded < -tolerance_pct:
            movement = "DECREASING"
        else:
            movement = "STABLE"

        return pct_change_rounded, movement

    @staticmethod
    def get_price_band(index_value: Optional[float]) -> str:
        """
        Assigns standard AIRFAIR price interpretation band based on index value.
        """
        if index_value is None:
            return "INSUFFICIENT_DATA"

        if index_value < 95.0:
            return "LOWER_THAN_BASELINE"
        elif index_value <= 105.0:
            return "NEAR_BASELINE"
        elif index_value <= 115.0:
            return "MODERATELY_EXPENSIVE"
        else:
            return "HIGH_FARE_LEVEL"

    @staticmethod
    def format_price_band_display(price_band: str) -> str:
        mapping = {
            "LOWER_THAN_BASELINE": "Lower than baseline",
            "NEAR_BASELINE": "Near baseline",
            "MODERATELY_EXPENSIVE": "Moderately expensive",
            "HIGH_FARE_LEVEL": "High fare level",
            "INSUFFICIENT_DATA": "Insufficient data"
        }
        return mapping.get(price_band, "Near baseline")
