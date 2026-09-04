from typing import Optional

# City & Airport Alias Dictionary for Indian Aviation
CITY_TO_IATA = {
    "DELHI": "DEL",
    "NEW DELHI": "DEL",
    "INDIRA GANDHI": "DEL",
    "MUMBAI": "BOM",
    "BOMBAY": "BOM",
    "CHHATRAPATI SHIVAJI": "BOM",
    "BENGALURU": "BLR",
    "BANGALORE": "BLR",
    "KEMPEGOWDA": "BLR",
    "CHENNAI": "MAA",
    "MADRAS": "MAA",
    "HYDERABAD": "HYD",
    "RAJIV GANDHI": "HYD",
    "KOLKATA": "CCU",
    "CALCUTTA": "CCU",
    "NETAJI SUBHASH CHANDRA": "CCU",
    "GOA": "GOI",
    "DABOLIM": "GOI",
    "MOPA": "GOX",
    "PUNE": "PNQ",
    "AHMEDABAD": "AMD",
    "KOCHI": "COK",
    "COCHIN": "COK",
    "JAIPUR": "JAI",
    "LUCKNOW": "LKO",
}


class RouteNormalizer:
    """
    Normalizes airport names, city names, and lower-case expressions to official 3-letter IATA codes.
    Prevents duplicate route definitions such as 'Delhi -> Mumbai' vs 'DEL -> BOM'.
    """

    @staticmethod
    def normalize_iata(code_or_city: str) -> Optional[str]:
        if not code_or_city:
            return None

        clean = str(code_or_city).strip().upper()

        # If already a 3-letter uppercase IATA code
        if len(clean) == 3 and clean.isalpha():
            return clean

        # Check aliases
        for alias, iata in CITY_TO_IATA.items():
            if alias in clean:
                return iata

        return clean if len(clean) == 3 else None

    @staticmethod
    def normalize_route(origin: str, destination: str) -> Optional[str]:
        norm_orig = RouteNormalizer.normalize_iata(origin)
        norm_dest = RouteNormalizer.normalize_iata(destination)
        if norm_orig and norm_dest and norm_orig != norm_dest:
            return f"{norm_orig}-{norm_dest}"
        return None
