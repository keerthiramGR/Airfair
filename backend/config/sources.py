import os

# DATA_SOURCE_MODE: "REAL" by default. Set to "MOCK" or TEST_MODE=true for offline calibration/testing
DATA_SOURCE_MODE = os.getenv("DATA_SOURCE_MODE", "REAL").upper()
TEST_MODE = os.getenv("TEST_MODE", "false").lower() in ("true", "1", "yes") or DATA_SOURCE_MODE == "MOCK"

# Airfare API Credentials & Configuration
AIRFARE_API_KEY = os.getenv("AIRFARE_API_KEY", "").strip()
AIRFARE_API_PROVIDER = os.getenv("AIRFARE_API_PROVIDER", "SERPAPI").strip().upper()
AIRFARE_API_BASE_URL = os.getenv("AIRFARE_API_BASE_URL", "").strip()
AIRFARE_API_ENABLED = os.getenv("AIRFARE_API_ENABLED", "true").lower() in ("true", "1", "yes")

# Centrally configured sources for polite, permitted data collection
SOURCE_CONFIG = {
    "REAL_API": {
        "name": f"Legitimate Flight Search API ({AIRFARE_API_PROVIDER})",
        "type": "REAL_API",
        "enabled": AIRFARE_API_ENABLED and bool(AIRFARE_API_KEY),
        "rate_limit_sec": 1.0,
        "timeout_sec": 15.0,
        "requires_browser": False
    },
    "AIRLINE_PORTAL": {
        "name": "Live Airline Availability Search",
        "type": "AIRLINE",
        "enabled": True,
        "rate_limit_sec": 1.5,
        "timeout_sec": 15.0,
        "requires_browser": False
    },
    "OTA_AGGREGATOR": {
        "name": "Travel Aggregator Comparative Feed",
        "type": "OTA",
        "enabled": True,
        "rate_limit_sec": 2.0,
        "timeout_sec": 15.0,
        "requires_browser": False
    },
    "MOCK": {
        "name": "AIRFAIR Internal Calibration Benchmark",
        "type": "MOCK",
        "enabled": TEST_MODE,
        "rate_limit_sec": 0.0,
        "timeout_sec": 5.0,
        "requires_browser": False
    }
}

# Supported Advance Purchase Windows
VALID_ADVANCE_WINDOWS = ["T+1", "T+7", "T+15", "T+30", "T+45"]

# Supported Fare Classes
VALID_FARE_CLASSES = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS"]

# Supported Availability Statuses
VALID_AVAILABILITY = ["AVAILABLE", "SOLD_OUT", "CANCELLED", "UNKNOWN"]

# Indian IATA Airport Mapping
IATA_CITY_MAP = {
    "DEL": "Delhi",
    "BOM": "Mumbai",
    "BLR": "Bengaluru",
    "MAA": "Chennai",
    "HYD": "Hyderabad",
    "CCU": "Kolkata",
    "GOI": "Goa",
    "PNQ": "Pune",
    "AMD": "Ahmedabad",
    "COK": "Kochi",
    "JAI": "Jaipur",
    "LKO": "Lucknow"
}

# Airline Code to Name Mapping
AIRLINE_CODE_MAP = {
    "6E": "IndiGo",
    "AI": "Air India",
    "IX": "Air India Express",
    "QP": "Akasa Air",
    "SG": "SpiceJet"
}
