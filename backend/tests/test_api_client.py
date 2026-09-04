import unittest
from backend.services.airfare_api_client import AirfareAPIClient
from backend.normalization.fare_normalizer import FareNormalizer
from backend.validation.fare_validator import FareValidator
from backend.deduplication.fare_deduplicator import FareDeduplicator


class TestAirfareAPIClient(unittest.TestCase):

    def setUp(self):
        self.client = AirfareAPIClient()

    def test_serpapi_response_parsing_and_pipeline_compatibility(self):
        """
        Verifies that actual SerpApi Google Flights JSON structures are correctly parsed,
        normalized, validated, and deduplicated through the existing pipeline.
        """
        sample_serpapi_payload = {
            "search_metadata": {
                "google_flights_url": "https://www.google.com/travel/flights/search?tfs=CBwQA..."
            },
            "best_flights": [
                {
                    "flights": [
                        {
                            "departure_airport": {"name": "Indira Gandhi International", "id": "DEL"},
                            "arrival_airport": {"name": "Chhatrapati Shivaji", "id": "BOM"},
                            "airline": "IndiGo",
                            "flight_number": "6E 2145"
                        }
                    ],
                    "total_duration": 135,
                    "price": 6850,
                    "type": "One way",
                    "airline_logo": "https://www.gstatic.com/flights/airline_logos/70px/6E.png"
                },
                {
                    "flights": [
                        {
                            "departure_airport": {"name": "Indira Gandhi International", "id": "DEL"},
                            "arrival_airport": {"name": "Chhatrapati Shivaji", "id": "BOM"},
                            "airline": "Air India",
                            "flight_number": "AI 887"
                        }
                    ],
                    "total_duration": 140,
                    "price": 7920,
                    "type": "One way",
                    "airline_logo": "https://www.gstatic.com/flights/airline_logos/70px/AI.png"
                }
            ],
            "other_flights": [
                {
                    "flights": [
                        {
                            "departure_airport": {"name": "Indira Gandhi International", "id": "DEL"},
                            "arrival_airport": {"name": "Chhatrapati Shivaji", "id": "BOM"},
                            "airline": "Akasa Air",
                            "flight_number": "QP 1102"
                        }
                    ],
                    "total_duration": 130,
                    "price": 6450,
                    "type": "One way",
                    "airline_logo": "https://www.gstatic.com/flights/airline_logos/70px/QP.png"
                }
            ]
        }

        # 1. Parse via AirfareAPIClient
        raw_quotes = self.client._parse_serpapi_response(
            data=sample_serpapi_payload,
            origin="DEL",
            destination="BOM",
            flight_date="2026-09-20",
            cabin_class="ECONOMY"
        )
        self.assertEqual(len(raw_quotes), 3)

        # 2. Pass through existing Normalizer & Validator
        normalized_records = []
        for r in raw_quotes:
            self.assertEqual(r["source"], "SERPAPI")
            norm = FareNormalizer.normalize_record(r)
            self.assertIsNotNone(norm)
            is_valid, err = FareValidator.validate(norm)
            self.assertTrue(is_valid, f"Validation failed: {err}")
            normalized_records.append(norm)

        # 3. Pass through Deduplicator
        unique, dups = FareDeduplicator.filter_batch(normalized_records)
        self.assertEqual(len(unique), 3)
        self.assertEqual(dups, 0)

        # Verify parsed airlines match Indian carriers
        carrier_codes = [r["airline_code"] for r in unique]
        self.assertIn("6E", carrier_codes)
        self.assertIn("AI", carrier_codes)
        self.assertIn("QP", carrier_codes)


if __name__ == "__main__":
    unittest.main(verbosity=2)
