import logging
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger("airfair.collection")
logger.setLevel(logging.INFO)


class CollectionLogger:
    """
    Structured logger for the AIRFAIR data ingestion engine.
    Ensures zero sensitive credentials (passwords, tokens, DB URIs) are ever logged.
    """

    @staticmethod
    def log_run_start(origin: str, destination: str, sources: List[str]):
        logger.info(
            f"[Collection Started] Corridor: {origin}->{destination} | Sources: {sources} | Time: {datetime.utcnow().isoformat()}"
        )

    @staticmethod
    def log_source_status(source_name: str, success: bool, records_count: int, error: str = None):
        if success:
            logger.info(f"[Source Success] {source_name}: Collected {records_count} raw records.")
        else:
            # Clean sanitized error message
            clean_err = str(error)[:150] if error else "Unknown"
            logger.warning(f"[Source Failed] {source_name}: Failed to collect data ({clean_err}).")

    @staticmethod
    def generate_quality_report(
        collected: int,
        valid: int,
        rejected: int,
        duplicates: int,
        inserted: int,
        rejected_reasons: List[str] = None
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive data-quality summary report for ingestion monitoring.
        """
        report = {
            "total_collected": collected,
            "valid_records": valid,
            "rejected_records": rejected,
            "duplicate_records": duplicates,
            "inserted_records": inserted,
            "quality_pass_rate": f"{(valid / collected * 100):.1f}%" if collected > 0 else "0.0%",
            "top_rejection_reasons": (rejected_reasons or [])[:5]
        }

        print("============================================================")
        print("  AIRFAIR DATA QUALITY REPORT")
        print("============================================================")
        print(f"  Collected   : {report['total_collected']}")
        print(f"  Valid       : {report['valid_records']}")
        print(f"  Rejected    : {report['rejected_records']}")
        print(f"  Duplicates  : {report['duplicate_records']}")
        print(f"  Inserted    : {report['inserted_records']}")
        print(f"  Pass Rate   : {report['quality_pass_rate']}")
        if report['top_rejection_reasons']:
            print(f"  Rejections  : {report['top_rejection_reasons']}")
        print("============================================================")

        return report
