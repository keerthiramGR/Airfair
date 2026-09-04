import unittest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from backend.main import app
from backend.historical.aggregation_service import AggregationService
from backend.historical.historical_service import HistoricalService, statistics_median

client = TestClient(app)


def test_statistics_median():
    assert statistics_median([6425.0]) == 6425.0
    assert statistics_median([6000.0, 7000.0]) == 6500.0
    assert statistics_median([5500.0, 6500.0, 8000.0]) == 6500.0


def test_trend_calculation():
    # 7000 -> 7200 (+2.8%) -> INCREASING
    assert AggregationService.calculate_trend(7200.0, 7000.0) == "INCREASING"
    # 7000 -> 6500 (-7.1%) -> DECREASING
    assert AggregationService.calculate_trend(6500.0, 7000.0) == "DECREASING"
    # 7000 -> 7050 (+0.7%) -> STABLE
    assert AggregationService.calculate_trend(7050.0, 7000.0) == "STABLE"
    assert AggregationService.calculate_trend(7000.0, None) == "STABLE"


def test_historical_fares_api_endpoint():
    response = client.get("/api/historical/fares?origin=DEL&destination=BOM&days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["route"] == "DEL-BOM"
    assert data["origin"] == "DEL"
    assert data["destination"] == "BOM"
    assert isinstance(data["data_points"], list)
    assert isinstance(data["total_observations"], int)
    assert isinstance(data["days_available"], int)


def test_data_quality_status_api_endpoint():
    response = client.get("/api/data-quality/status?origin=DEL&destination=BOM")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "records_processed" in data
    assert "valid" in data
    assert "quality_score" in data
    assert "quality_category" in data
    assert isinstance(data["quality_score"], (int, float))


def test_existing_apis_not_broken():
    # Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"

    # Routes
    res_routes = client.get("/api/routes")
    assert res_routes.status_code == 200

    # Fares
    res_fares = client.get("/api/fares?limit=5")
    assert res_fares.status_code == 200
    assert "items" in res_fares.json()
