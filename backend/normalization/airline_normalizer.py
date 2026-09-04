from typing import Optional

AIRLINE_ALIASES = {
    "6E": "6E",
    "INDIGO": "6E",
    "INTERGLOBE": "6E",
    "AI": "AI",
    "AIR INDIA": "AI",
    "AIRINDIA": "AI",
    "IX": "IX",
    "AIR INDIA EXPRESS": "IX",
    "AIRINDIA EXPRESS": "IX",
    "AIX CONNECT": "IX",
    "SG": "SG",
    "SPICEJET": "SG",
    "SPICE JET": "SG",
    "QP": "QP",
    "AKASA": "QP",
    "AKASA AIR": "QP",
    "UK": "AI",  # Vistara merged into Air India
    "VISTARA": "AI"
}

AIRLINE_OFFICIAL_NAMES = {
    "6E": "IndiGo",
    "AI": "Air India",
    "IX": "Air India Express",
    "SG": "SpiceJet",
    "QP": "Akasa Air"
}


class AirlineNormalizer:
    """
    Normalizes diverse airline names, aliases, and lowercase variations to official IATA airline codes.
    """

    @staticmethod
    def normalize_code(name_or_code: str) -> Optional[str]:
        if not name_or_code:
            return None

        clean = str(name_or_code).strip().upper()

        if clean in AIRLINE_OFFICIAL_NAMES:
            return clean

        # Exact match
        if clean in AIRLINE_ALIASES:
            return AIRLINE_ALIASES[clean]

        # Substring match: check longest aliases first to prevent short substrings (e.g. 'AI') matching 'AKASA AIR'
        sorted_aliases = sorted(AIRLINE_ALIASES.items(), key=lambda x: len(x[0]), reverse=True)
        for alias, code in sorted_aliases:
            if len(alias) > 2 and alias in clean:
                return code

        return clean if len(clean) == 2 else None

    @staticmethod
    def get_official_name(code: str) -> str:
        return AIRLINE_OFFICIAL_NAMES.get(code.upper(), code.upper())
