from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database.connection import get_engine, SessionLocal
from backend.database.models import FareQuote, Route, Airline, FareDailySummary
from backend.data_quality.cleaner import DataCleaner
from backend.data_quality.quality_checker import QualityChecker
from backend.data_quality.missing_value_handler import MissingValueHandler
from backend.data_quality.outlier_detector import OutlierDetector
from backend.data_quality.quality_report import QualityReportGenerator
from backend.historical.aggregation_service import AggregationService


class DataQualityPipeline:
    """
    End-to-end repeatable data quality & historical aggregation pipeline.
    Transforms raw fare quotes into clean, analysis-ready historical datasets.
    """

    def __init__(self, db: Session):
        self.db = db
        self.aggregation_service = AggregationService(db)

    def execute_pipeline(
        self,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        limit: Optional[int] = None
    ) -> Dict[str, Any]:
        started_at = datetime.now(timezone.utc)

        # 1. Fetch raw/observed records from Supabase PostgreSQL
        query = (
            self.db.query(FareQuote, Route, Airline)
            .join(Route, FareQuote.route_id == Route.id)
            .join(Airline, FareQuote.airline_id == Airline.id)
        )

        if origin:
            query = query.filter(Route.origin == origin.strip().upper())
        if destination:
            query = query.filter(Route.destination == destination.strip().upper())

        query = query.order_by(FareQuote.id.asc())
        if limit:
            query = query.limit(limit)

        raw_results = query.all()
        total_fetched = len(raw_results)

        if total_fetched == 0:
            return QualityReportGenerator.generate(
                total_processed=0,
                valid_records=0,
                invalid_records=0,
                duplicates=0,
                outliers=0,
                clean_records=0,
                needs_review=0,
                quality_scores=[],
                missing_audit=MissingValueHandler.audit_batch([])
            )

        # Convert to working dictionaries preserving raw provenance
        raw_records = []
        for quote, rte, air in raw_results:
            raw_records.append({
                "quote_id": quote.id,
                "airline_code": air.code,
                "airline_name": air.name,
                "origin": rte.origin,
                "destination": rte.destination,
                "flight_date": quote.flight_date.isoformat(),
                "scraped_at": quote.scraped_at.isoformat() if quote.scraped_at else None,
                "advance_purchase_window": quote.advance_purchase_window,
                "fare_class": quote.fare_class,
                "base_fare": float(quote.base_fare) if quote.base_fare is not None else None,
                "taxes": float(quote.taxes) if quote.taxes is not None else None,
                "user_development_fee": float(quote.user_development_fee) if quote.user_development_fee is not None else None,
                "convenience_fee": float(quote.convenience_fee) if quote.convenience_fee is not None else None,
                "total_fare": float(quote.total_fare) if quote.total_fare is not None else None,
                "currency": quote.currency,
                "source": quote.source,
                "source_url": quote.source_url,
                "availability_status": quote.availability_status
            })

        # 2. Quality Evaluation & Cleaning
        cleaned_records = []
        valid_count = 0
        invalid_count = 0
        needs_review_count = 0
        quality_scores = []

        for rec in raw_records:
            cleaned = DataCleaner.clean_record(rec)
            if not cleaned:
                invalid_count += 1
                quality_scores.append(20.0)
                continue

            is_valid, score, category, issues = QualityChecker.evaluate_record(cleaned)
            cleaned["quality_score"] = score
            cleaned["quality_category"] = category
            cleaned["quality_issues"] = issues
            quality_scores.append(score)

            if is_valid:
                valid_count += 1
                if category == "Needs Review":
                    needs_review_count += 1
                cleaned_records.append(cleaned)
            else:
                invalid_count += 1

        # 3. Missing Value Audit (Zero Fabrication Policy)
        missing_audit = MissingValueHandler.audit_batch(cleaned_records)

        # 4. Outlier Detection (Non-Destructive Flagging)
        flagged_records = OutlierDetector.flag_batch_outliers(cleaned_records)
        outlier_count = sum(1 for r in flagged_records if r.get("is_outlier"))
        clean_count = len(flagged_records) - outlier_count

        # 5. Daily Aggregation & Idempotent Upsert to Supabase
        daily_summaries = self.aggregation_service.aggregate_records(flagged_records)
        summaries_persisted = self.aggregation_service.persist_summaries(daily_summaries)

        # 6. Generate Telemetry Report
        report = QualityReportGenerator.generate(
            total_processed=total_fetched,
            valid_records=valid_count,
            invalid_records=invalid_count,
            duplicates=0,  # DB-level unique constraints handle deduplication
            outliers=outlier_count,
            clean_records=clean_count,
            needs_review=needs_review_count,
            quality_scores=quality_scores,
            missing_audit=missing_audit,
            source="SERPAPI/SUPABASE"
        )
        report["daily_summaries_created"] = summaries_persisted
        report["duration_seconds"] = round((datetime.now(timezone.utc) - started_at).total_seconds(), 2)

        return report


def run_data_quality_job(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    limit: Optional[int] = None
) -> Dict[str, Any]:
    """
    Standalone runner for the Data Quality job.
    """
    db = SessionLocal()
    try:
        pipeline = DataQualityPipeline(db)
        report = pipeline.execute_pipeline(origin=origin, destination=destination, limit=limit)
        print(QualityReportGenerator.format_console_summary(report))
        return report
    finally:
        db.close()


if __name__ == "__main__":
    run_data_quality_job()
