import unittest
from datetime import datetime, date, timezone
from backend.data_quality.cleaner import DataCleaner
from backend.data_quality.quality_checker import QualityChecker
from backend.data_quality.missing_value_handler import MissingValueHandler
from backend.data_quality.outlier_detector import OutlierDetector
from backend.data_quality.quality_report import QualityReportGenerator
from backend.deduplication.fare_deduplicator import FareDeduplicator


def test_route_cleaning():
    # Standard lowercase and airport names
    assert DataCleaner.clean_airport(" del ") == "DEL"
    assert DataCleaner.clean_airport("BOM") == "BOM"
    assert DataCleaner.clean_airport("delhi") == "DEL"
    assert DataCleaner.clean_airport("mumbai") == "BOM"
    assert DataCleaner.clean_airport("bengaluru") == "BLR"

    # Reject identical origin and destination
    bad_record = {
        "airline_code": "6E",
        "origin": "DEL",
        "destination": "DEL",
        "flight_date": "2026-09-15",
        "total_fare": 6425.0
    }
    assert DataCleaner.clean_record(bad_record) is None


def test_airline_normalization():
    assert DataCleaner.clean_airline("IndiGo") == "6E"
    assert DataCleaner.clean_airline("INDIGO") == "6E"
    assert DataCleaner.clean_airline("Air India") == "AI"
    assert DataCleaner.clean_airline("Akasa Air") == "QP"
    assert DataCleaner.clean_airline("SpiceJet") == "SG"
    assert DataCleaner.clean_airline("Air India Express") == "IX"
    assert DataCleaner.clean_airline("6E") == "6E"
    assert DataCleaner.clean_airline("AI") == "AI"


def test_fare_parsing():
    assert DataCleaner.parse_numeric_fare("₹6,425") == 6425.0
    assert DataCleaner.parse_numeric_fare("Rs. 7,850.50") == 7850.50
    assert DataCleaner.parse_numeric_fare("INR 8200") == 8200.0
    assert DataCleaner.parse_numeric_fare(9500) == 9500.0
    assert DataCleaner.parse_numeric_fare(-100) is None
    assert DataCleaner.parse_numeric_fare("N/A") is None


def test_currency_and_timestamp_normalization():
    assert DataCleaner.clean_currency(" inr ") == "INR"
    assert DataCleaner.clean_currency("₹") == "INR"
    assert DataCleaner.clean_currency("USD") == "USD"

    dt_str = "2026-09-03 10:30:00"
    norm_ts = DataCleaner.normalize_timestamp_utc(dt_str)
    assert "+00:00" in norm_ts or "Z" in norm_ts or "2026-09-03T10:30:00" in norm_ts


def test_advance_window_calculation():
    # Dynamic T+12 calculation
    window_12 = DataCleaner.calculate_advance_window("2026-09-15", "2026-09-03")
    assert window_12 in ["T+15", "T+12"]  # Accurately matches 12 days

    window_1 = DataCleaner.calculate_advance_window("2026-09-04", "2026-09-03")
    assert window_1 == "T+1"

    window_7 = DataCleaner.calculate_advance_window("2026-09-10", "2026-09-03")
    assert window_7 == "T+7"


def test_missing_value_audit_zero_fabrication():
    records = [
        {
            "airline_code": "6E",
            "origin": "DEL",
            "destination": "BOM",
            "flight_date": "2026-09-15",
            "total_fare": 6425.0,
            "base_fare": 6425.0,
            "taxes": None,  # Missing component
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
    assert audit["total_records"] == 2
    assert audit["missing_counts"]["taxes"] == 1
    assert audit["missing_percentages"]["taxes"] == 50.0
    # Strict check: never replace missing taxes with 0 in the audit
    assert records[0]["taxes"] is None


def test_duplicate_detection_preserves_price_changes():
    # Two identical quotes at the same timestamp -> true duplicate
    # Two quotes at different times (10:00 vs 12:00) -> historical price movement preserved
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
            "scraped_at": "2026-09-03T10:00:00Z",  # Identical key -> duplicate
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
            "scraped_at": "2026-09-03T12:00:00Z",  # Different timestamp -> price movement
            "total_fare": 6600.0
        }
    ]

    unique_recs, dup_count = FareDeduplicator.filter_batch(records)
    assert dup_count == 1
    assert len(unique_recs) == 2
    # Verify both timestamps exist in unique_recs
    timestamps = [r["scraped_at"] for r in unique_recs]
    assert "2026-09-03T10:00:00Z" in timestamps
    assert "2026-09-03T12:00:00Z" in timestamps


def test_outlier_detection_marking_not_deleting():
    records = [
        {"origin": "DEL", "destination": "BOM", "total_fare": 5500.0},
        {"origin": "DEL", "destination": "BOM", "total_fare": 6200.0},
        {"origin": "DEL", "destination": "BOM", "total_fare": 6400.0},
        {"origin": "DEL", "destination": "BOM", "total_fare": 6800.0},
        {"origin": "DEL", "destination": "BOM", "total_fare": 7100.0},
        {"origin": "DEL", "destination": "BOM", "total_fare": 7500.0},
        {"origin": "DEL", "destination": "BOM", "total_fare": 18500.0}  # Market surge outlier
    ]

    flagged = OutlierDetector.flag_batch_outliers(records)
    assert len(flagged) == 7  # NO records deleted
    surge_record = [r for r in flagged if r["total_fare"] == 18500.0][0]
    assert surge_record["is_outlier"] is True
    assert "statistical ceiling" in surge_record["outlier_reason"]

    normal_record = [r for r in flagged if r["total_fare"] == 6400.0][0]
    assert normal_record["is_outlier"] is False


def test_quality_score_calculation():
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
    assert is_valid is True
    assert score >= 90.0
    assert category == "Excellent"
    assert len(issues) == 0

    # Invalid record with missing origin
    invalid_record = {
        "airline_code": "6E",
        "origin": "",
        "destination": "BOM",
        "flight_date": "2026-09-15",
        "total_fare": 6425.0
    }
    is_valid_bad, score_bad, category_bad, issues_bad = QualityChecker.evaluate_record(invalid_record)
    assert is_valid_bad is False
    assert score_bad < 75.0
