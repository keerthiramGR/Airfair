from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.collectors.base_collector import BaseCollector
from backend.collectors.mock_collector import MockCollector
from backend.collectors.airline_collector import AirlineCollector
from backend.collectors.ota_collector import OTACollector
from backend.normalization.fare_normalizer import FareNormalizer
from backend.validation.fare_validator import FareValidator
from backend.deduplication.fare_deduplicator import FareDeduplicator
from backend.ingestion.fare_ingestion_service import FareIngestionService
from backend.monitoring.collection_logger import CollectionLogger
from backend.database.models import CollectionRun
from backend.config.sources import TEST_MODE


def get_collector_for_source(source_type: str) -> Optional[BaseCollector]:
    st = source_type.upper()
    if st in ("AIRLINE", "REAL_API", "SERPAPI", "SKYSCANNER", "KIWI"):
        return AirlineCollector()
    elif st == "OTA":
        return OTACollector()
    elif st == "MOCK":
        return MockCollector()
    return None


def execute_collection_job(
    db: Session,
    origin: str = "DEL",
    destination: str = "BOM",
    flight_date: Optional[str] = None,
    advance_purchase_window: str = "T+7",
    sources: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Orchestrates the complete Phase 4 ingestion pipeline:
    SOURCE -> COLLECT -> PARSE -> NORMALIZE -> VALIDATE -> DEDUPLICATE -> STORE -> SUPABASE
    """
    if not flight_date:
        # Default to 7 days from today
        flight_date = date.today().isoformat()

    if not sources:
        sources = ["MOCK"] if TEST_MODE else ["AIRLINE", "OTA"]


    started_at = datetime.now(timezone.utc)
    CollectionLogger.log_run_start(origin, destination, sources)

    # Record run in collection_runs table
    run_record = CollectionRun(
        started_at=started_at,
        status="IN_PROGRESS",
        source=",".join(sources),
        origin=origin,
        destination=destination,
        flight_date=datetime.strptime(flight_date[:10], "%Y-%m-%d").date(),
        records_collected=0,
        records_inserted=0,
        records_rejected=0
    )
    db.add(run_record)
    db.commit()

    all_raw_quotes = []
    sources_attempted = 0
    successful_sources = 0

    # 1. & 2. SOURCE SELECTION & COLLECTION (With Error Isolation)
    for src_type in sources:
        collector = get_collector_for_source(src_type)
        if not collector:
            continue

        sources_attempted += 1
        try:
            raw_batch = collector.collect(origin, destination, flight_date, advance_purchase_window)
            all_raw_quotes.extend(raw_batch)
            successful_sources += 1
            CollectionLogger.log_source_status(collector.source_name, True, len(raw_batch))
        except Exception as src_err:
            CollectionLogger.log_source_status(collector.source_name, False, 0, str(src_err))

    total_collected = len(all_raw_quotes)

    # 3. & 4. PARSE, NORMALIZE & VALIDATE
    valid_records = []
    rejected_reasons = []

    for raw in all_raw_quotes:
        normalized = FareNormalizer.normalize_record(raw)
        if not normalized:
            rejected_reasons.append("Normalization failed (missing mandatory flight/route identifiers)")
            continue

        is_valid, reason = FareValidator.validate(normalized)
        if is_valid:
            valid_records.append(normalized)
        else:
            rejected_reasons.append(reason)

    records_valid = len(valid_records)
    records_rejected = total_collected - records_valid

    # 5. DEDUPLICATE (Preserving distinct price trajectories)
    deduped_records, duplicate_count = FareDeduplicator.filter_batch(valid_records)

    # 6. ATOMIC INGESTION TO SUPABASE POSTGRESQL
    ingestion_service = FareIngestionService(db)
    inserted_count, ingest_errors = ingestion_service.ingest_batch(deduped_records)

    completed_at = datetime.now(timezone.utc)
    duration_sec = (completed_at - started_at).total_seconds()

    # Update collection_runs record in DB
    run_record.completed_at = completed_at
    run_record.status = "COMPLETED" if inserted_count > 0 or total_collected == 0 else "FAILED"
    run_record.records_collected = total_collected
    run_record.records_inserted = inserted_count
    run_record.records_rejected = records_rejected
    if ingest_errors:
        run_record.error_message = "; ".join(ingest_errors[:3])
    db.commit()

    # Log summary data quality report
    CollectionLogger.generate_quality_report(
        collected=total_collected,
        valid=records_valid,
        rejected=records_rejected,
        duplicates=duplicate_count,
        inserted=inserted_count,
        rejected_reasons=rejected_reasons
    )

    return {
        "status": "completed",
        "run_id": run_record.id,
        "routes_processed": 1,
        "sources_attempted": sources_attempted,
        "sources_successful": successful_sources,
        "records_collected": total_collected,
        "records_valid": records_valid,
        "records_rejected": records_rejected,
        "records_duplicate": duplicate_count,
        "records_inserted": inserted_count,
        "duration_seconds": round(duration_sec, 2),
        "flight_date": flight_date,
        "advance_purchase_window": advance_window if (advance_window := advance_purchase_window) else "T+7"
    }
