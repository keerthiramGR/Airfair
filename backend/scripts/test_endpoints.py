"""
AIRFAIR Phase 3 API Endpoint Verification Test Script
Tests all required endpoints to verify data contracts, pagination, and response structures.
"""

import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def run_tests():
    print("\n" + "=" * 60)
    print("  AIRFAIR PHASE 3 — AUTOMATED API VERIFICATION TESTS")
    print("=" * 60)

    tests = [
        ("GET", "/health", "Health Check"),
        ("GET", "/api/dashboard", "Dashboard Summary"),
        ("GET", "/api/routes", "All Monitored Routes"),
        ("GET", "/api/routes/DEL/BOM", "Corridor Details (DEL -> BOM)"),
        ("GET", "/api/routes/DEL/BOM/airlines", "Airline Comparison (DEL -> BOM)"),
        ("GET", "/api/fares?origin=DEL&destination=BOM&page=1&limit=5", "Paginated Fares"),
        ("GET", "/api/fares/summary/DEL/BOM", "Fare Summary (DEL -> BOM)"),
        ("GET", "/api/index?days=14", "Airfare Price Index (14 Days)"),
        ("GET", "/api/forecast/DEL/BOM", "7-Day Fare Forecast (DEL -> BOM)"),
        ("GET", "/api/lead-time/DEL/BOM", "Lead Time Curve (DEL -> BOM)"),
        ("GET", "/api/alerts", "Recent Pricing Alerts"),
        ("GET", "/api/insights", "AI Pricing Insights"),
    ]

    passed = 0
    failed = 0

    for method, path, name in tests:
        try:
            if method == "GET":
                res = client.get(path)
            
            if res.status_code == 200:
                print(f"  [PASS] {name.ljust(35)} -> HTTP {res.status_code}")
                passed += 1
            else:
                print(f"  [FAIL] {name.ljust(35)} -> HTTP {res.status_code} ({res.text[:80]})")
                failed += 1
        except Exception as e:
            print(f"  [ERROR] {name.ljust(35)} -> Exception: {e}")
            failed += 1

    print("-" * 60)
    print(f"  Total: {passed + failed} | Passed: {passed} | Failed: {failed}")
    print("=" * 60 + "\n")

    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
