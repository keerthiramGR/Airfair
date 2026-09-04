import unittest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from backend.main import app
from backend.monitoring.ml_telemetry import MLReadinessService
from backend.deduplication.fare_deduplicator import FareDeduplicator


class TestMLReadiness(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_readiness_classification(self):
        # Insufficient data (< 3 collection dates)
        self.assertEqual(MLReadinessService.classify_route_readiness(1, 15), "INSUFFICIENT_DATA")
        self.assertEqual(MLReadinessService.classify_route_readiness(2, 50), "INSUFFICIENT_DATA")

        # Accumulating data (3 to 29 collection dates)
        self.assertEqual(MLReadinessService.classify_route_readiness(3, 20), "ACCUMULATING_DATA")
        self.assertEqual(MLReadinessService.classify_route_readiness(14, 80), "ACCUMULATING_DATA")
        self.assertEqual(MLReadinessService.classify_route_readiness(29, 95), "ACCUMULATING_DATA")

        # Ready for dataset preparation (>= 30 collection dates and >= 100 observations)
        self.assertEqual(MLReadinessService.classify_route_readiness(30, 100), "READY_FOR_DATASET_PREPARATION")
        self.assertEqual(MLReadinessService.classify_route_readiness(45, 250), "READY_FOR_DATASET_PREPARATION")

        # Not ready if >= 30 dates but < 100 observations
        self.assertEqual(MLReadinessService.classify_route_readiness(30, 80), "ACCUMULATING_DATA")

    def test_consecutive_days_streak_calculation(self):
        d1 = date(2026, 9, 1)
        d2 = date(2026, 9, 2)
        d3 = date(2026, 9, 3)
        d5 = date(2026, 9, 5)

        # 3 consecutive days
        self.assertEqual(MLReadinessService.calculate_consecutive_days_streak({d1, d2, d3}), 3)
        # Gap between d3 and d5 -> max streak is 3
        self.assertEqual(MLReadinessService.calculate_consecutive_days_streak({d1, d2, d3, d5}), 3)
        # Empty set
        self.assertEqual(MLReadinessService.calculate_consecutive_days_streak(set()), 0)

    def test_deduplication_preserves_price_changes(self):
        # Two identical records with same fare -> deduplicated
        quote1 = {
            "airline_code": "6E",
            "route_origin": "DEL",
            "route_destination": "BOM",
            "flight_date": "2026-09-15",
            "advance_purchase_window": "T+15",
            "fare_class": "ECONOMY",
            "source": "SERPAPI",
            "scraped_at": "2026-09-03T10:00:00Z",
            "total_fare": 6400.0
        }
        quote2 = {
            "airline_code": "6E",
            "route_origin": "DEL",
            "route_destination": "BOM",
            "flight_date": "2026-09-15",
            "advance_purchase_window": "T+15",
            "fare_class": "ECONOMY",
            "source": "SERPAPI",
            "scraped_at": "2026-09-03T10:00:00Z",
            "total_fare": 6400.0
        }
        # Legitimate price change later that day
        quote3 = {
            "airline_code": "6E",
            "route_origin": "DEL",
            "route_destination": "BOM",
            "flight_date": "2026-09-15",
            "advance_purchase_window": "T+15",
            "fare_class": "ECONOMY",
            "source": "SERPAPI",
            "scraped_at": "2026-09-03T16:00:00Z",
            "total_fare": 6850.0  # fare changed
        }

        unique_quotes, dups = FareDeduplicator.filter_batch([quote1, quote2, quote3])
        self.assertEqual(dups, 1)
        self.assertEqual(len(unique_quotes), 2)
        fares = [q["total_fare"] for q in unique_quotes]
        self.assertIn(6400.0, fares)
        self.assertIn(6850.0, fares)

    def test_ml_readiness_api(self):
        res = self.client.get("/api/collection/ml-readiness")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("overall_readiness_status", data)
        self.assertIn("dataset_progress_percentage", data)
        self.assertIn("total_real_observations", data)
        self.assertIn("unique_collection_dates", data)
        self.assertIn("unique_flight_dates", data)
        self.assertIn("per_route_readiness", data)
        self.assertIn("advance_window_coverage", data)


if __name__ == "__main__":
    unittest.main()
