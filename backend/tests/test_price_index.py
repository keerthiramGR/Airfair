import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.index.baseline_service import BaselineService
from backend.index.movement_service import MovementService
from backend.index.index_calculator import IndexCalculator


class TestPriceIndexEngine(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_baseline_median_calculation(self):
        # Odd number of values
        fares = [6200.0, 6500.0, 7100.0]
        self.assertEqual(BaselineService.calculate_baseline(fares), 6500.0)

        # Even number of values: median is average of 2 middle items
        fares_even = [6000.0, 6400.0, 6600.0, 7200.0]
        self.assertEqual(BaselineService.calculate_baseline(fares_even), 6500.0)

        # Minimum observations threshold
        self.assertIsNone(BaselineService.calculate_baseline([6500.0, 7000.0], min_observations=3))
        self.assertEqual(BaselineService.calculate_baseline([6500.0, 7000.0], min_observations=2), 6750.0)

    def test_index_formula(self):
        # Index = (Current / Baseline) * 100
        # Current = 7150, Baseline = 6500 -> 110.0
        self.assertEqual(IndexCalculator.calculate_index(7150.0, 6500.0), 110.0)
        # Current = 6500, Baseline = 6500 -> 100.0
        self.assertEqual(IndexCalculator.calculate_index(6500.0, 6500.0), 100.0)
        # Current = 5850, Baseline = 6500 -> 90.0
        self.assertEqual(IndexCalculator.calculate_index(5850.0, 6500.0), 90.0)
        # Missing or invalid baseline
        self.assertIsNone(IndexCalculator.calculate_index(7000.0, None))
        self.assertIsNone(IndexCalculator.calculate_index(7000.0, 0.0))

    def test_percentage_change_and_movement(self):
        # Previous 6500, Current 6800 -> +4.62% -> INCREASING
        pct, mov = MovementService.calculate_price_change(6800.0, 6500.0)
        self.assertEqual(pct, 4.62)
        self.assertEqual(mov, "INCREASING")

        # Previous 6800, Current 6400 -> -5.88% -> DECREASING
        pct_down, mov_down = MovementService.calculate_price_change(6400.0, 6800.0)
        self.assertEqual(pct_down, -5.88)
        self.assertEqual(mov_down, "DECREASING")

        # Previous 6500, Current 6530 (+0.46%, within +/- 1% tolerance) -> STABLE
        pct_stable, mov_stable = MovementService.calculate_price_change(6530.0, 6500.0)
        self.assertEqual(pct_stable, 0.46)
        self.assertEqual(mov_stable, "STABLE")

        # No previous fare
        pct_none, mov_none = MovementService.calculate_price_change(6500.0, None)
        self.assertEqual(pct_none, 0.0)
        self.assertEqual(mov_none, "STABLE")

    def test_price_bands(self):
        self.assertEqual(MovementService.get_price_band(92.0), "LOWER_THAN_BASELINE")
        self.assertEqual(MovementService.get_price_band(100.0), "NEAR_BASELINE")
        self.assertEqual(MovementService.get_price_band(108.5), "MODERATELY_EXPENSIVE")
        self.assertEqual(MovementService.get_price_band(122.0), "HIGH_FARE_LEVEL")
        self.assertEqual(MovementService.get_price_band(None), "INSUFFICIENT_DATA")

    def test_coverage_calculation(self):
        # 9 days out of 30 requested -> 30.0%
        self.assertEqual(IndexCalculator.calculate_coverage(9, 30), 30.0)
        # 7 days out of 7 requested -> 100.0%
        self.assertEqual(IndexCalculator.calculate_coverage(7, 7), 100.0)
        # 0 available -> 0.0%
        self.assertEqual(IndexCalculator.calculate_coverage(0, 30), 0.0)

    def test_reliability_calculation(self):
        # Insufficient data
        self.assertEqual(IndexCalculator.determine_reliability(2, 2, 6.7), "INSUFFICIENT")
        # Low coverage
        self.assertEqual(IndexCalculator.determine_reliability(4, 10, 13.3), "LOW")
        # Medium coverage (9 days in 30 days)
        self.assertEqual(IndexCalculator.determine_reliability(9, 47, 30.0), "MEDIUM")
        # High coverage
        self.assertEqual(IndexCalculator.determine_reliability(25, 120, 83.3), "HIGH")

    def test_index_apis(self):
        # Test GET /api/index with corridor params
        res = self.client.get("/api/index?origin=DEL&destination=BOM&days=30")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["origin"], "DEL")
        self.assertEqual(data["destination"], "BOM")
        self.assertIn("index_value", data)
        self.assertIn("baseline_fare", data)
        self.assertIn("current_fare", data)
        self.assertIn("coverage_percentage", data)
        self.assertIn("reliability", data)

        # Test GET /api/index/history
        res_hist = self.client.get("/api/index/history?origin=DEL&destination=BOM&days=30")
        self.assertEqual(res_hist.status_code, 200)
        hist = res_hist.json()
        self.assertIsInstance(hist, list)

        # Test carrier-specific filtering
        res_carrier = self.client.get("/api/index?origin=DEL&destination=BOM&days=30&airline=6E")
        self.assertEqual(res_carrier.status_code, 200)
        self.assertEqual(res_carrier.json()["origin"], "DEL")


if __name__ == "__main__":
    unittest.main()
