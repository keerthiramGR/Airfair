"""
AIRFAIR Phase 4 — Data Collection & Ingestion Pipeline Unit & Integration Tests
"""

import sys
import unittest
from datetime import datetime, date
from backend.normalization.route_normalizer import RouteNormalizer
from backend.normalization.airline_normalizer import AirlineNormalizer
from backend.normalization.fare_normalizer import FareNormalizer
from backend.parsers.fare_parser import FareParser
from backend.validation.fare_validator import FareValidator
from backend.deduplication.fare_deduplicator import FareDeduplicator
from backend.collectors.mock_collector import MockCollector
from backend.collectors.airline_collector import AirlineCollector
from backend.collectors.ota_collector import OTACollector


class TestAirfairCollectionPipeline(unittest.TestCase):

    def test_route_normalization(self):
        """Test airport and city mapping to official 3-letter IATA codes"""
        self.assertEqual(RouteNormalizer.normalize_iata("Delhi"), "DEL")
        self.assertEqual(RouteNormalizer.normalize_iata("delhi"), "DEL")
        self.assertEqual(RouteNormalizer.normalize_iata("MUMBAI"), "BOM")
        self.assertEqual(RouteNormalizer.normalize_iata("Bengaluru"), "BLR")
        self.assertEqual(RouteNormalizer.normalize_iata("Bangalore"), "BLR")
        self.assertEqual(RouteNormalizer.normalize_iata("Chennai"), "MAA")
        self.assertEqual(RouteNormalizer.normalize_iata("Hyderabad"), "HYD")
        self.assertEqual(RouteNormalizer.normalize_route("delhi", "mumbai"), "DEL-BOM")
        self.assertIsNone(RouteNormalizer.normalize_route("DEL", "DEL"))

    def test_airline_normalization(self):
        """Test airline names, aliases, and lowercase variations map to IATA carrier codes"""
        self.assertEqual(AirlineNormalizer.normalize_code("IndiGo"), "6E")
        self.assertEqual(AirlineNormalizer.normalize_code("indigo"), "6E")
        self.assertEqual(AirlineNormalizer.normalize_code("6E"), "6E")
        self.assertEqual(AirlineNormalizer.normalize_code("Air India"), "AI")
        self.assertEqual(AirlineNormalizer.normalize_code("air india"), "AI")
        self.assertEqual(AirlineNormalizer.normalize_code("SpiceJet"), "SG")
        self.assertEqual(AirlineNormalizer.normalize_code("Akasa Air"), "QP")
        self.assertEqual(AirlineNormalizer.normalize_code("Air India Express"), "IX")
        self.assertEqual(AirlineNormalizer.get_official_name("6E"), "IndiGo")

    def test_fare_and_currency_parsing(self):
        """Test currency symbols, whitespace, and commas are stripped from amounts"""
        self.assertEqual(FareParser.parse_amount("₹7,950"), 7950.0)
        self.assertEqual(FareParser.parse_amount("Rs. 6500"), 6500.0)
        self.assertEqual(FareParser.parse_amount("6500 INR"), 6500.0)
        self.assertEqual(FareParser.parse_amount("12,450.50"), 12450.50)
        self.assertEqual(FareParser.parse_amount(5500), 5500.0)
        self.assertIsNone(FareParser.parse_amount(""))
        self.assertIsNone(FareParser.parse_amount(None))
        self.assertEqual(FareParser.parse_currency("₹ INR"), "INR")

    def test_advance_purchase_calculation(self):
        """Test advance window calculation (T+1, T+7, T+15, T+30, T+45)"""
        search_date = "2026-09-03"
        self.assertEqual(FareNormalizer.calculate_advance_window("2026-09-04", search_date), "T+1")
        self.assertEqual(FareNormalizer.calculate_advance_window("2026-09-10", search_date), "T+7")
        self.assertEqual(FareNormalizer.calculate_advance_window("2026-09-18", search_date), "T+15")
        self.assertEqual(FareNormalizer.calculate_advance_window("2026-10-01", search_date), "T+30")
        self.assertEqual(FareNormalizer.calculate_advance_window("2026-11-01", search_date), "T+45")

    def test_fare_validation_consistency(self):
        """Test strict validation of fare breakdown consistency: total = base + taxes + udf + convenience"""
        valid_quote = {
            "airline_code": "6E",
            "route_origin": "DEL",
            "route_destination": "BOM",
            "flight_date": "2026-09-10",
            "advance_purchase_window": "T+7",
            "fare_class": "ECONOMY",
            "base_fare": 6500.0,
            "taxes": 1100.0,
            "user_development_fee": 100.0,
            "convenience_fee": 250.0,
            "total_fare": 7950.0,
            "currency": "INR",
            "source": "AIRLINE",
            "availability_status": "AVAILABLE"
        }
        is_valid, err = FareValidator.validate(valid_quote)
        self.assertTrue(is_valid, f"Validation unexpectedly failed: {err}")

        # Inconsistent total fare should fail
        invalid_quote = valid_quote.copy()
        invalid_quote["total_fare"] = 9999.0
        is_invalid, err = FareValidator.validate(invalid_quote)
        self.assertFalse(is_invalid)
        self.assertIn("Fare consistency failed", err)

        # Identical origin and destination should fail
        same_route_quote = valid_quote.copy()
        same_route_quote["route_destination"] = "DEL"
        is_same_invalid, err = FareValidator.validate(same_route_quote)
        self.assertFalse(is_same_invalid)

    def test_deduplication_preserves_historical_pricing(self):
        """Test deduplication skips identical records but preserves price movements across timestamps"""
        quote_1 = {
            "airline_code": "6E",
            "route_origin": "DEL",
            "route_destination": "BOM",
            "flight_date": "2026-09-10",
            "advance_purchase_window": "T+7",
            "fare_class": "ECONOMY",
            "total_fare": 7500.0,
            "source": "AIRLINE",
            "scraped_at": "2026-09-03T10:00:00"
        }
        # Duplicate of quote 1
        quote_1_dup = quote_1.copy()

        # Quote at a higher price during a later collection time (12:00 PM)
        quote_price_change = quote_1.copy()
        quote_price_change["total_fare"] = 7900.0
        quote_price_change["scraped_at"] = "2026-09-03T12:00:00"

        batch = [quote_1, quote_1_dup, quote_price_change]
        unique, dups = FareDeduplicator.filter_batch(batch)

        self.assertEqual(len(unique), 2)
        self.assertEqual(dups, 1)

    def test_collectors_generate_normalized_compatible_data(self):
        """Test that MockCollector and OTACollector produce valid raw records, and AirlineCollector uses active key"""
        mock_rec = MockCollector().collect("DEL", "BOM", "2026-09-10", "T+7")
        self.assertGreater(len(mock_rec), 0)
        norm_mock = FareNormalizer.normalize_record(mock_rec[0])
        is_valid, err = FareValidator.validate(norm_mock)
        self.assertTrue(is_valid, f"Mock validation failed: {err}")

        # AirlineCollector with configured API key successfully retrieves real flights
        collector = AirlineCollector()
        records = collector.collect("DEL", "BOM", "2026-09-15", "T+7")
        self.assertGreater(len(records), 0)
        norm_real = FareNormalizer.normalize_record(records[0])
        is_v, err = FareValidator.validate(norm_real)
        self.assertTrue(is_v, f"Real quote failed validation: {err}")




if __name__ == "__main__":
    unittest.main(verbosity=2)
