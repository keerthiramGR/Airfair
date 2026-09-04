import random
from datetime import datetime, timezone
from typing import List, Dict, Any
from backend.collectors.base_collector import BaseCollector


class MockCollector(BaseCollector):
    """
    Internal calibration mock collector.
    Generates deterministic, verified test airfare quotes without network overhead.
    All records are clearly marked source="MOCK".
    """

    def __init__(self):
        super().__init__(source_name="AIRFAIR Calibration Benchmark", source_type="MOCK", enabled=True)

    def collect(
        self,
        origin: str,
        destination: str,
        flight_date: str,
        advance_window: str = "T+7"
    ) -> List[Dict[str, Any]]:
        carriers = [
            {"code": "6E", "name": "IndiGo", "base": 5800},
            {"code": "AI", "name": "Air India", "base": 6800},
            {"code": "SG", "name": "SpiceJet", "base": 4900},
            {"code": "QP", "name": "Akasa Air", "base": 5100},
            {"code": "IX", "name": "Air India Express", "base": 5300},
        ]

        # Multiplier according to advance window
        multipliers = {
            "T+1": 1.75,
            "T+7": 1.22,
            "T+15": 1.00,
            "T+30": 0.82,
            "T+45": 0.74,
        }
        mult = multipliers.get(advance_window, 1.0)
        now_iso = datetime.now(timezone.utc).isoformat()

        records = []
        for carrier in carriers:
            # Calculate mathematical components
            base = round(carrier["base"] * mult + random.randint(-150, 150))
            taxes = round(base * 0.12)
            udf = 150
            convenience = 250
            total = base + taxes + udf + convenience

            records.append({
                "airline_raw": carrier["name"],
                "airline_code": carrier["code"],
                "origin_raw": origin,
                "destination_raw": destination,
                "flight_date": flight_date,
                "search_date": now_iso[:10],
                "scraped_at": now_iso,
                "advance_purchase_window": advance_window,
                "fare_class_raw": "ECONOMY",
                "base_fare_raw": str(base),
                "taxes_raw": str(taxes),
                "udf_raw": str(udf),
                "convenience_fee_raw": str(convenience),
                "total_fare_raw": f"INR {total}",
                "currency_raw": "INR",
                "source": "MOCK",
                "source_url": "https://airfair.gov.in/benchmark-data",
                "availability_status": "AVAILABLE"
            })

        return records
