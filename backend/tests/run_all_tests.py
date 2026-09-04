import unittest
import sys
from fastapi.testclient import TestClient
from backend.main import app
from backend.data_quality.cleaner import DataCleaner
from backend.data_quality.quality_checker import QualityChecker
from backend.data_quality.missing_value_handler import MissingValueHandler
from backend.data_quality.outlier_detector import OutlierDetector
from backend.data_quality.quality_report import QualityReportGenerator
from backend.deduplication.fare_deduplicator import FareDeduplicator
from backend.historical.aggregation_service import AggregationService
from backend.historical.historical_service import HistoricalService, statistics_median
from backend.index.baseline_service import BaselineService
from backend.index.movement_service import MovementService
from backend.index.index_calculator import IndexCalculator


class TestDataQuality(unittest.TestCase):
    def test_route_cleaning(self):
        self.assertEqual(DataCleaner.clean_airport(" del "), "DEL")
        self.assertEqual(DataCleaner.clean_airport("BOM"), "BOM")
        self.assertEqual(DataCleaner.clean_airport("delhi"), "DEL")
        self.assertEqual(DataCleaner.clean_airport("mumbai"), "BOM")
        self.assertEqual(DataCleaner.clean_airport("bengaluru"), "BLR")

        bad_record = {
            "airline_code": "6E",
            "origin": "DEL",
            "destination": "DEL",
            "flight_date": "2026-09-15",
            "total_fare": 6425.0
        }
        self.assertIsNone(DataCleaner.clean_record(bad_record))

    def test_airline_normalization(self):
        self.assertEqual(DataCleaner.clean_airline("IndiGo"), "6E")
        self.assertEqual(DataCleaner.clean_airline("INDIGO"), "6E")
        self.assertEqual(DataCleaner.clean_airline("Air India"), "AI")
        self.assertEqual(DataCleaner.clean_airline("Akasa Air"), "QP")
        self.assertEqual(DataCleaner.clean_airline("SpiceJet"), "SG")
        self.assertEqual(DataCleaner.clean_airline("Air India Express"), "IX")
        self.assertEqual(DataCleaner.clean_airline("6E"), "6E")
        self.assertEqual(DataCleaner.clean_airline("AI"), "AI")

    def test_fare_parsing(self):
        self.assertEqual(DataCleaner.parse_numeric_fare("₹6,425"), 6425.0)
        self.assertEqual(DataCleaner.parse_numeric_fare("Rs. 7,850.50"), 7850.50)
        self.assertEqual(DataCleaner.parse_numeric_fare("INR 8200"), 8200.0)
        self.assertEqual(DataCleaner.parse_numeric_fare(9500), 9500.0)
        self.assertIsNone(DataCleaner.parse_numeric_fare(-100))
        self.assertIsNone(DataCleaner.parse_numeric_fare("N/A"))

    def test_currency_and_timestamp_normalization(self):
        self.assertEqual(DataCleaner.clean_currency(" inr "), "INR")
        self.assertEqual(DataCleaner.clean_currency("₹"), "INR")
        self.assertEqual(DataCleaner.clean_currency("USD"), "USD")

        dt_str = "2026-09-03 10:30:00"
        norm_ts = DataCleaner.normalize_timestamp_utc(dt_str)
        self.assertTrue("+00:00" in norm_ts or "Z" in norm_ts or "2026-09-03T10:30:00" in norm_ts)

    def test_advance_window_calculation(self):
        window_12 = DataCleaner.calculate_advance_window("2026-09-15", "2026-09-03")
        self.assertIn(window_12, ["T+15", "T+12"])

        window_1 = DataCleaner.calculate_advance_window("2026-09-04", "2026-09-03")
        self.assertEqual(window_1, "T+1")

        window_7 = DataCleaner.calculate_advance_window("2026-09-10", "2026-09-03")
        self.assertEqual(window_7, "T+7")

    def test_missing_value_audit_zero_fabrication(self):
        records = [
            {
                "airline_code": "6E",
                "origin": "DEL",
                "destination": "BOM",
                "flight_date": "2026-09-15",
                "total_fare": 6425.0,
                "base_fare": 6425.0,
                "taxes": None,
                "user_development_fee": None,
                "convenience_fee": None,
                "fare_class": "ECONOMY"
            },
            {
                "airline_code": "AI",
                "origin": "DEL",
                "destination": "BOM",
                "flight_date": "2026-09-15",
                "total_fare": 7100.0,
                "base_fare": 6000.0,
                "taxes": 850.0,
                "user_development_fee": 250.0,
                "convenience_fee": 0.0,
                "fare_class": "ECONOMY"
            }
        ]
        audit = MissingValueHandler.audit_batch(records)
        self.assertEqual(audit["total_records"], 2)
        self.assertEqual(audit["missing_counts"]["taxes"], 1)
        self.assertEqual(audit["missing_percentages"]["taxes"], 50.0)
        self.assertIsNone(records[0]["taxes"])

    def test_duplicate_detection_preserves_price_changes(self):
        records = [
            {
                "airline_code": "6E",
                "route_origin": "DEL",
                "route_destination": "BOM",
                "flight_date": "2026-09-25",
                "advance_purchase_window": "T+15",
                "fare_class": "ECONOMY",
                "source": "SERPAPI",
                "scraped_at": "2026-09-03T10:00:00Z",
                "total_fare": 6400.0
            },
            {
                "airline_code": "6E",
                "route_origin": "DEL",
                "route_destination": "BOM",
                "flight_date": "2026-09-25",
                "advance_purchase_window": "T+15",
                "fare_class": "ECONOMY",
                "source": "SERPAPI",
                "scraped_at": "2026-09-03T10:00:00Z",
                "total_fare": 6400.0
            },
            {
                "airline_code": "6E",
                "route_origin": "DEL",
                "route_destination": "BOM",
                "flight_date": "2026-09-25",
                "advance_purchase_window": "T+15",
                "fare_class": "ECONOMY",
                "source": "SERPAPI",
                "scraped_at": "2026-09-03T12:00:00Z",
                "total_fare": 6600.0
            }
        ]
        unique_recs, dup_count = FareDeduplicator.filter_batch(records)
        self.assertEqual(dup_count, 1)
        self.assertEqual(len(unique_recs), 2)

    def test_outlier_detection(self):
        records = [
            {"origin": "DEL", "destination": "BOM", "total_fare": 5500.0},
            {"origin": "DEL", "destination": "BOM", "total_fare": 6200.0},
            {"origin": "DEL", "destination": "BOM", "total_fare": 6400.0},
            {"origin": "DEL", "destination": "BOM", "total_fare": 6800.0},
            {"origin": "DEL", "destination": "BOM", "total_fare": 7100.0},
            {"origin": "DEL", "destination": "BOM", "total_fare": 7500.0},
            {"origin": "DEL", "destination": "BOM", "total_fare": 18500.0}
        ]
        flagged = OutlierDetector.flag_batch_outliers(records)
        self.assertEqual(len(flagged), 7)
        surge = [r for r in flagged if r["total_fare"] == 18500.0][0]
        self.assertTrue(surge["is_outlier"])
        normal = [r for r in flagged if r["total_fare"] == 6400.0][0]
        self.assertFalse(normal["is_outlier"])

    def test_quality_score(self):
        clean_valid = {
            "airline_code": "6E",
            "origin": "DEL",
            "destination": "BOM",
            "flight_date": "2026-09-15",
            "scraped_at": "2026-09-03T10:00:00Z",
            "total_fare": 6425.0,
            "base_fare": 5500.0,
            "taxes": 825.0,
            "user_development_fee": 100.0,
            "convenience_fee": 0.0,
            "currency": "INR"
        }
        is_valid, score, category, issues = QualityChecker.evaluate_record(clean_valid)
        self.assertTrue(is_valid)
        self.assertGreaterEqual(score, 90.0)
        self.assertEqual(category, "Excellent")


class TestHistoricalAndAPIs(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_statistics_median(self):
        self.assertEqual(statistics_median([6425.0]), 6425.0)
        self.assertEqual(statistics_median([6000.0, 7000.0]), 6500.0)

    def test_trend_calculation(self):
        self.assertEqual(AggregationService.calculate_trend(7200.0, 7000.0), "INCREASING")
        self.assertEqual(AggregationService.calculate_trend(6500.0, 7000.0), "DECREASING")
        self.assertEqual(AggregationService.calculate_trend(7050.0, 7000.0), "STABLE")

    def test_historical_fares_api(self):
        res = self.client.get("/api/historical/fares?origin=DEL&destination=BOM&days=30")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["route"], "DEL-BOM")
        self.assertIsInstance(data["data_points"], list)

    def test_data_quality_status_api(self):
        res = self.client.get("/api/data-quality/status?origin=DEL&destination=BOM")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("quality_score", data)
        self.assertIn("quality_category", data)

    def test_existing_apis(self):
        res_health = self.client.get("/health")
        self.assertEqual(res_health.status_code, 200)

        res_fares = self.client.get("/api/fares?limit=5")
        self.assertEqual(res_fares.status_code, 200)


class TestPriceIndexEngine(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_baseline_median_calculation(self):
        fares = [6200.0, 6500.0, 7100.0]
        self.assertEqual(BaselineService.calculate_baseline(fares), 6500.0)

        fares_even = [6000.0, 6400.0, 6600.0, 7200.0]
        self.assertEqual(BaselineService.calculate_baseline(fares_even), 6500.0)

        self.assertIsNone(BaselineService.calculate_baseline([6500.0, 7000.0], min_observations=3))
        self.assertEqual(BaselineService.calculate_baseline([6500.0, 7000.0], min_observations=2), 6750.0)

    def test_index_formula(self):
        self.assertEqual(IndexCalculator.calculate_index(7150.0, 6500.0), 110.0)
        self.assertEqual(IndexCalculator.calculate_index(6500.0, 6500.0), 100.0)
        self.assertEqual(IndexCalculator.calculate_index(5850.0, 6500.0), 90.0)
        self.assertIsNone(IndexCalculator.calculate_index(7000.0, None))

    def test_percentage_change_and_movement(self):
        pct, mov = MovementService.calculate_price_change(6800.0, 6500.0)
        self.assertEqual(pct, 4.62)
        self.assertEqual(mov, "INCREASING")

        pct_down, mov_down = MovementService.calculate_price_change(6400.0, 6800.0)
        self.assertEqual(pct_down, -5.88)
        self.assertEqual(mov_down, "DECREASING")

        pct_stable, mov_stable = MovementService.calculate_price_change(6530.0, 6500.0)
        self.assertEqual(pct_stable, 0.46)
        self.assertEqual(mov_stable, "STABLE")

    def test_price_bands(self):
        self.assertEqual(MovementService.get_price_band(92.0), "LOWER_THAN_BASELINE")
        self.assertEqual(MovementService.get_price_band(100.0), "NEAR_BASELINE")
        self.assertEqual(MovementService.get_price_band(108.5), "MODERATELY_EXPENSIVE")
        self.assertEqual(MovementService.get_price_band(122.0), "HIGH_FARE_LEVEL")

    def test_coverage_and_reliability(self):
        self.assertEqual(IndexCalculator.calculate_coverage(9, 30), 30.0)
        self.assertEqual(IndexCalculator.determine_reliability(9, 47, 30.0), "MEDIUM")
        self.assertEqual(IndexCalculator.determine_reliability(2, 2, 6.7), "INSUFFICIENT")

    def test_index_apis(self):
        res = self.client.get("/api/index?origin=DEL&destination=BOM&days=30")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["origin"], "DEL")
        self.assertEqual(data["destination"], "BOM")
        self.assertIn("index_value", data)

        res_hist = self.client.get("/api/index/history?origin=DEL&destination=BOM&days=30")
        self.assertEqual(res_hist.status_code, 200)
        self.assertIsInstance(res_hist.json(), list)


class TestMLReadinessSuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_readiness_classification(self):
        from backend.monitoring.ml_telemetry import MLReadinessService
        self.assertEqual(MLReadinessService.classify_route_readiness(1, 15), "INSUFFICIENT_DATA")
        self.assertEqual(MLReadinessService.classify_route_readiness(3, 20), "ACCUMULATING_DATA")
        self.assertEqual(MLReadinessService.classify_route_readiness(30, 100), "READY_FOR_DATASET_PREPARATION")

    def test_consecutive_days_streak(self):
        from backend.monitoring.ml_telemetry import MLReadinessService
        from datetime import date
        d1 = date(2026, 9, 1)
        d2 = date(2026, 9, 2)
        d3 = date(2026, 9, 3)
        self.assertEqual(MLReadinessService.calculate_consecutive_days_streak({d1, d2, d3}), 3)

    def test_deduplication_preservation(self):
        q1 = {
            "airline_code": "6E", "route_origin": "DEL", "route_destination": "BOM",
            "flight_date": "2026-09-15", "advance_purchase_window": "T+15", "fare_class": "ECONOMY",
            "source": "SERPAPI", "scraped_at": "2026-09-03T10:00:00Z", "total_fare": 6400.0
        }
        q2 = {
            "airline_code": "6E", "route_origin": "DEL", "route_destination": "BOM",
            "flight_date": "2026-09-15", "advance_purchase_window": "T+15", "fare_class": "ECONOMY",
            "source": "SERPAPI", "scraped_at": "2026-09-03T10:00:00Z", "total_fare": 6400.0
        }
        q3 = {
            "airline_code": "6E", "route_origin": "DEL", "route_destination": "BOM",
            "flight_date": "2026-09-15", "advance_purchase_window": "T+15", "fare_class": "ECONOMY",
            "source": "SERPAPI", "scraped_at": "2026-09-03T16:00:00Z", "total_fare": 6850.0
        }
        unique_recs, dups = FareDeduplicator.filter_batch([q1, q2, q3])
        self.assertEqual(dups, 1)
        self.assertEqual(len(unique_recs), 2)

    def test_ml_readiness_api(self):
        res = self.client.get("/api/collection/ml-readiness")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("overall_readiness_status", data)
        self.assertIn("dataset_progress_percentage", data)
        self.assertIn("total_real_observations", data)


class TestMLDatasetPreparationSuite(unittest.TestCase):
    def test_days_until_flight_calculation(self):
        from backend.ml.feature_engineering import MLFeatureEngineer
        from datetime import date, datetime
        records = [
            {
                "id": 1, "route_id": 1, "origin": "DEL", "destination": "BOM", "route": "DEL-BOM",
                "airline_id": 1, "airline_code": "6E", "airline_name": "IndiGo",
                "flight_date": date(2026, 9, 10),
                "observation_timestamp": datetime(2026, 9, 3, 10, 0, 0),
                "observation_date": date(2026, 9, 3),
                "advance_purchase_window": "T+7", "fare_class": "ECONOMY",
                "total_fare": 6500.0, "base_fare": 5500.0, "taxes": 850.0,
                "user_development_fee": 150.0, "convenience_fee": 0.0,
                "currency": "INR", "source": "SERPAPI", "availability_status": "AVAILABLE"
            }
        ]
        engineer = MLFeatureEngineer()
        features = engineer.engineer_features(records)
        self.assertEqual(features[0]["days_until_flight"], 7)
        self.assertEqual(features[0]["advance_purchase_window"], "T+7")

    def test_chronological_ordering_and_zero_future_leakage(self):
        from backend.ml.feature_engineering import MLFeatureEngineer
        from datetime import date, datetime
        records = [
            {
                "id": 2, "route_id": 1, "origin": "DEL", "destination": "BOM", "route": "DEL-BOM",
                "airline_id": 1, "airline_code": "6E", "airline_name": "IndiGo",
                "flight_date": date(2026, 9, 15),
                "observation_timestamp": datetime(2026, 9, 3, 10, 0, 0),
                "observation_date": date(2026, 9, 3),
                "advance_purchase_window": "T+12", "fare_class": "ECONOMY",
                "total_fare": 7200.0, "base_fare": 6000.0, "taxes": 1050.0,
                "user_development_fee": 150.0, "convenience_fee": 0.0,
                "currency": "INR", "source": "SERPAPI", "availability_status": "AVAILABLE"
            },
            {
                "id": 1, "route_id": 1, "origin": "DEL", "destination": "BOM", "route": "DEL-BOM",
                "airline_id": 1, "airline_code": "6E", "airline_name": "IndiGo",
                "flight_date": date(2026, 9, 15),
                "observation_timestamp": datetime(2026, 9, 2, 10, 0, 0),
                "observation_date": date(2026, 9, 2),
                "advance_purchase_window": "T+13", "fare_class": "ECONOMY",
                "total_fare": 6800.0, "base_fare": 5800.0, "taxes": 850.0,
                "user_development_fee": 150.0, "convenience_fee": 0.0,
                "currency": "INR", "source": "SERPAPI", "availability_status": "AVAILABLE"
            }
        ]
        engineer = MLFeatureEngineer()
        features = engineer.engineer_features(records)
        self.assertEqual(features[0]["quote_id"], 1)
        self.assertIsNone(features[0]["previous_observed_fare"])
        self.assertEqual(features[1]["quote_id"], 2)
        self.assertEqual(features[1]["previous_observed_fare"], 6800.0)
        self.assertEqual(features[1]["price_delta_vs_previous"], 400.0)

    def test_split_insufficient_data_status(self):
        from backend.ml.dataset_exporter import MLDatasetExporter
        class MockDB:
            pass
        exporter = MLDatasetExporter(MockDB())
        sample = [{"observation_date": "2026-09-02", "total_fare": 6500.0}]
        _, split_sum = exporter._partition_dataset(sample)
        self.assertEqual(split_sum["split_status"], "INSUFFICIENT_TEMPORAL_DATA")


from backend.tests.test_booking import TestBookingModule
from backend.tests.test_travelport_ticketing import TestTravelportTicketingIntegration


if __name__ == "__main__":
    unittest.main()





