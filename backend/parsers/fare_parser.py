import re
from typing import Optional, Tuple, Any


class FareParser:
    """
    Parses raw textual fare strings and extracts clean numeric amounts.
    Strips symbols like '₹', 'Rs.', 'Rs', 'INR', commas, and whitespace.
    """

    @staticmethod
    def parse_amount(raw_val: Any) -> Optional[float]:
        if raw_val is None:
            return None

        if isinstance(raw_val, (int, float)):
            return float(raw_val)

        text = str(raw_val).strip()
        if not text:
            return None

        # Remove currency prefixes, symbols, and commas
        cleaned = re.sub(r"[₹$,\s]|Rs\.?|INR", "", text, flags=re.IGNORECASE)

        # Match first valid float/int sequence
        match = re.search(r"[-+]?\d*\.?\d+", cleaned)
        if match:
            try:
                return float(match.group())
            except ValueError:
                return None
        return None

    @staticmethod
    def parse_currency(raw_currency: Any, default: str = "INR") -> str:
        if not raw_currency:
            return default
        text = str(raw_currency).strip().upper()
        if "INR" in text or "₹" in text or "RS" in text:
            return "INR"
        return text if len(text) <= 5 else default
