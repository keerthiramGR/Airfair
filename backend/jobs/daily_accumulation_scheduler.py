import sys
import argparse
from datetime import datetime, timezone
from backend.database.connection import SessionLocal
from backend.jobs.accumulation_job import AccumulationPipeline, SYSTEMATIC_CORRIDORS, ADVANCE_PURCHASE_WINDOWS
from backend.monitoring.ml_telemetry import MLReadinessService


def execute_daily_accumulation(corridors=None, windows=None, delay=1.5):
    """
    Independently executable daily collection job for real airfare observations.
    Can be run via cron / Task Scheduler or CI/CD without an infinite loop.
    """
    print("==================================================")
    print("   AIRFAIR DAILY REAL AIRFARE ACCUMULATION JOB    ")
    print(f"   Started at: {datetime.now(timezone.utc).isoformat()}")
    print("==================================================")

    db = SessionLocal()
    try:
        pipeline = AccumulationPipeline(db)
        result = pipeline.execute_systematic_collection(
            corridors=corridors,
            windows=windows,
            delay_between_requests=delay
        )

        print("\n--- JOB EXECUTION SUMMARY ---")
        print(f"Status: {result.get('status')}")
        print(f"Corridors Processed: {result.get('corridors_requested')}")
        print(f"Windows Sampled: {result.get('windows_requested')}")
        print(f"Total Quotes Collected: {result.get('total_collected')}")
        print(f"New Unique Quotes Stored in Supabase: {result.get('total_inserted')}")
        print(f"Data Quality Score: {result.get('data_quality_score')}")

        readiness = MLReadinessService.get_readiness_report(db)
        print("\n--- ML DATASET READINESS STATUS ---")
        print(f"Overall Readiness: {readiness.get('overall_readiness_status')}")
        print(f"Dataset Progress: {readiness.get('dataset_progress_percentage')}%")
        print(f"Total Real Observations: {readiness.get('total_real_observations')}")
        print(f"Unique Collection Dates: {readiness.get('unique_collection_dates')}")
        print(f"Routes Covered: {readiness.get('route_coverage')}")

        return result
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AIRFAIR Daily Real Airfare Accumulation Job")
    parser.add_argument("--corridors", nargs="+", help="Specific corridors e.g. DEL-BOM MAA-DEL")
    parser.add_argument("--delay", type=float, default=1.5, help="Rate limit delay in seconds")
    args = parser.parse_args()

    corridor_tuples = None
    if args.corridors:
        corridor_tuples = [tuple(c.split("-")) for c in args.corridors if "-" in c]

    execute_daily_accumulation(corridors=corridor_tuples, delay=args.delay)
