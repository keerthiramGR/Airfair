import os
import time
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from backend.database.connection import SessionLocal
from backend.database.models import CollectionRun, FareQuote, Route, Airline
from backend.services.airfare_api_client import AirfareAPIClient
from backend.normalization.fare_normalizer import FareNormalizer
from backend.validation.fare_validator import FareValidator
from backend.deduplication.fare_deduplicator import FareDeduplicator
from backend.ingestion.fare_ingestion_service import FareIngestionService
from backend.monitoring.collection_logger import CollectionLogger
from backend.monitoring.ml_telemetry import MLTelemetryService
from backend.jobs.data_quality_job import DataQualityPipeline

# High-density domestic aviation corridors for longitudinal ML training dataset
SYSTEMATIC_CORRIDORS = [
    ("DEL", "BOM"),  # Delhi -> Mumbai
    ("MAA", "DEL"),  # Chennai -> Delhi
    ("DEL", "BLR"),  # Delhi -> Bengaluru
    ("BOM", "BLR"),  # Mumbai -> Bengaluru
    ("DEL", "CCU"),  # Delhi -> Kolkata
    ("DEL", "HYD")   # Delhi -> Hyderabad
]

# Comprehensive advance-purchase lead-time matrix
ADVANCE_PURCHASE_WINDOWS = [
    ("T+1", 1),    # Next day / Last minute
    ("T+3", 3),    # Short lead
    ("T+7", 7),    # 1 Week
    ("T+15", 15),  # 2 Weeks
    ("T+30", 30),  # 1 Month
    ("T+45", 45)   # 1.5 Months
]


class AccumulationPipeline:
    """
    Automated Real Airfare Data Accumulation Pipeline (Phase 7 Step 3).
    Systematically collects authentic SerpApi / Google Flights real airfare observations
    across corridors, multi-advance lead times (T+1, T+3, T+7, T+15, T+30, T+45),
    and airlines. Preserves full temporal provenance, timestamps, and genuine price trajectories
    in Supabase PostgreSQL while guarding against accidental redundant duplicates.
    """

    def __init__(self, db: Session):
        self.db = db
        self.api_client = AirfareAPIClient()
        self.ingestion_service = FareIngestionService(db)

    def accumulate_corridor(
        self,
        origin: str,
        destination: str,
        advance_window: str = "T+7",
        days_ahead: int = 7
    ) -> Dict[str, Any]:
        flight_date = (date.today() + timedelta(days=days_ahead)).isoformat()
        started_at = datetime.now(timezone.utc)

        # Log collection run
        run_record = CollectionRun(
            started_at=started_at,
            status="IN_PROGRESS",
            source="SERPAPI",
            origin=origin,
            destination=destination,
            flight_date=datetime.strptime(flight_date[:10], "%Y-%m-%d").date(),
            records_collected=0,
            records_inserted=0,
            records_rejected=0
        )
        self.db.add(run_record)
        self.db.commit()

        if not self.api_client.is_configured():
            err_msg = "Airfare API credentials not configured (AIRFARE_API_KEY missing or disabled)."
            run_record.status = "FAILED"
            run_record.error_message = err_msg
            run_record.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            return {
                "route": f"{origin}-{destination}",
                "advance_window": advance_window,
                "flight_date": flight_date,
                "status": "failed",
                "records_collected": 0,
                "records_inserted": 0,
                "error": err_msg
            }

        try:
            # Query authentic Google Flights search API
            raw_quotes = self.api_client.search_flights(
                origin=origin,
                destination=destination,
                flight_date=flight_date,
                cabin_class="ECONOMY"
            )

            for q in raw_quotes:
                q["advance_purchase_window"] = advance_window

            total_collected = len(raw_quotes)

            # Normalize & Validate
            valid_records = []
            rejected_reasons = []
            for raw in raw_quotes:
                norm = FareNormalizer.normalize_record(raw)
                if not norm:
                    rejected_reasons.append("Normalization failed")
                    continue
                is_valid, reason = FareValidator.validate(norm)
                if is_valid:
                    valid_records.append(norm)
                else:
                    rejected_reasons.append(reason)

            # Deduplicate (strictly preserves timestamp price changes across collection hours)
            deduped, dup_count = FareDeduplicator.filter_batch(valid_records)

            # Ingest to Supabase PostgreSQL
            inserted_count, ingest_errors = self.ingestion_service.ingest_batch(deduped)

            completed_at = datetime.now(timezone.utc)
            run_record.completed_at = completed_at
            run_record.status = "COMPLETED" if inserted_count > 0 or total_collected > 0 else "FAILED"
            run_record.records_collected = total_collected
            run_record.records_inserted = inserted_count
            run_record.records_rejected = len(rejected_reasons)
            if ingest_errors:
                run_record.error_message = "; ".join(ingest_errors[:3])
            self.db.commit()

            return {
                "route": f"{origin}-{destination}",
                "flight_date": flight_date,
                "advance_window": advance_window,
                "status": "success",
                "records_collected": total_collected,
                "records_valid": len(valid_records),
                "records_duplicate": dup_count,
                "records_inserted": inserted_count,
                "duration_seconds": round((completed_at - started_at).total_seconds(), 2)
            }

        except Exception as exc:
            completed_at = datetime.now(timezone.utc)
            run_record.completed_at = completed_at
            run_record.status = "FAILED"
            run_record.error_message = str(exc)
            self.db.commit()
            return {
                "route": f"{origin}-{destination}",
                "advance_window": advance_window,
                "flight_date": flight_date,
                "status": "failed",
                "records_collected": 0,
                "records_inserted": 0,
                "error": str(exc)
            }

    def execute_systematic_collection(
        self,
        corridors: Optional[List[Tuple[str, str]]] = None,
        windows: Optional[List[Tuple[str, int]]] = None,
        delay_between_requests: float = 1.5
    ) -> Dict[str, Any]:
        """
        Executes systematic multi-corridor and multi-window data accumulation.
        """
        routes_to_run = corridors or SYSTEMATIC_CORRIDORS
        windows_to_run = windows or ADVANCE_PURCHASE_WINDOWS

        results = []
        total_inserted = 0
        total_collected = 0

        for orig, dest in routes_to_run:
            for window_code, days_ahead in windows_to_run:
                res = self.accumulate_corridor(
                    origin=orig,
                    destination=dest,
                    advance_window=window_code,
                    days_ahead=days_ahead
                )
                results.append(res)
                total_collected += res.get("records_collected", 0)
                total_inserted += res.get("records_inserted", 0)

                time.sleep(delay_between_requests)

        # Trigger data quality pipeline and daily summaries update
        dq_pipeline = DataQualityPipeline(self.db)
        dq_report = dq_pipeline.execute_pipeline()

        # Generate ML telemetry
        ml_telemetry = MLTelemetryService.get_telemetry(self.db)

        return {
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "corridors_requested": len(routes_to_run),
            "windows_requested": len(windows_to_run),
            "total_collected": total_collected,
            "total_inserted": total_inserted,
            "data_quality_score": dq_report.get("quality_score", 100.0),
            "ml_telemetry": ml_telemetry,
            "corridor_results": results
        }


def run_systematic_accumulation(corridors=None, windows=None) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        pipeline = AccumulationPipeline(db)
        summary = pipeline.execute_systematic_collection(
            corridors=corridors or [("DEL", "BOM"), ("MAA", "DEL")],
            windows=windows or [("T+1", 1), ("T+7", 7), ("T+15", 15), ("T+30", 30)],
            delay_between_requests=1.5
        )
        return summary
    finally:
        db.close()


if __name__ == "__main__":
    run_systematic_accumulation()
