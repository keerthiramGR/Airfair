import unittest
from datetime import datetime, date
from backend.ml.dataset_builder import MLDatasetBuilder
from backend.ml.feature_engineering import MLFeatureEngineer
from backend.ml.dataset_exporter import MLDatasetExporter


class TestMLDatasetPreparation(unittest.TestCase):
    def test_mock_records_excluded(self):
        # Builder must exclude MOCK records
        class MockDB:
            def query(self, *args):
                class QueryMock:
                    def join(self, *args, **kwargs):
                        return self
                    def filter(self, *args, **kwargs):
                        return self
                    def order_by(self, *args, **kwargs):
                        return self
                    def all(self):
                        return []
                return QueryMock()

        builder = MLDatasetBuilder(MockDB())
        records, audit = builder.extract_real_observations()
        self.assertEqual(len(records), 0)
        self.assertEqual(audit["eligible_records_count"], 0)

    def test_days_until_flight_and_advance_purchase(self):
        records = [
            {
                "id": 1, "route_id": 1, "origin": "DEL", "destination": "BOM", "route": "DEL-BOM",
                "airline_id": 1, "airline_code": "6E", "airline_name": "IndiGo",
                "flight_date": date(2026, 9, 10),
                "observation_timestamp": datetime(2026, 9, 3, 10, 0, 0),
                "observation_date": date(2026, 9, 3),
                "advance_purchase_window": "T+7",
                "fare_class": "ECONOMY",
                "total_fare": 6500.0, "base_fare": 5500.0, "taxes": 850.0,
                "user_development_fee": 150.0, "convenience_fee": 0.0,
                "currency": "INR", "source": "SERPAPI", "availability_status": "AVAILABLE"
            }
        ]
        engineer = MLFeatureEngineer()
        features = engineer.engineer_features(records)
        self.assertEqual(len(features), 1)
        # 2026-09-10 - 2026-09-03 = 7 days
        self.assertEqual(features[0]["days_until_flight"], 7)
        self.assertEqual(features[0]["advance_purchase_window"], "T+7")
        self.assertEqual(features[0]["flight_day_of_week"], 3)  # Thursday
        self.assertEqual(features[0]["is_flight_weekend"], 0)

    def test_chronological_ordering_and_zero_future_leakage(self):
        # Two observations of the same flight on consecutive dates
        records = [
            {
                "id": 2, "route_id": 1, "origin": "DEL", "destination": "BOM", "route": "DEL-BOM",
                "airline_id": 1, "airline_code": "6E", "airline_name": "IndiGo",
                "flight_date": date(2026, 9, 15),
                "observation_timestamp": datetime(2026, 9, 3, 10, 0, 0),
                "observation_date": date(2026, 9, 3),
                "advance_purchase_window": "T+12",
                "fare_class": "ECONOMY",
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
                "advance_purchase_window": "T+13",
                "fare_class": "ECONOMY",
                "total_fare": 6800.0, "base_fare": 5800.0, "taxes": 850.0,
                "user_development_fee": 150.0, "convenience_fee": 0.0,
                "currency": "INR", "source": "SERPAPI", "availability_status": "AVAILABLE"
            }
        ]
        engineer = MLFeatureEngineer()
        features = engineer.engineer_features(records)

        # Record from 2026-09-02 must be first
        self.assertEqual(features[0]["quote_id"], 1)
        self.assertIsNone(features[0]["previous_observed_fare"])  # No prior observation exists

        # Record from 2026-09-03 must be second and have 6800.0 as previous_observed_fare
        self.assertEqual(features[1]["quote_id"], 2)
        self.assertEqual(features[1]["previous_observed_fare"], 6800.0)
        self.assertEqual(features[1]["price_delta_vs_previous"], 400.0)
        self.assertEqual(features[1]["price_delta_pct_vs_previous"], 5.88)

    def test_dataset_split_insufficient_data_status(self):
        class MockDB:
            pass

        exporter = MLDatasetExporter(MockDB())
        # Dataset with only 2 observation dates
        sample_dataset = [
            {"observation_date": "2026-09-02", "total_fare": 6500.0},
            {"observation_date": "2026-09-03", "total_fare": 6800.0}
        ]
        _, split_summary = exporter._partition_dataset(sample_dataset)
        self.assertEqual(split_summary["split_status"], "INSUFFICIENT_TEMPORAL_DATA")
        self.assertEqual(split_summary["train_count"], 0)


if __name__ == "__main__":
    unittest.main()
