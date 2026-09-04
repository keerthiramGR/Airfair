from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class QualityReportGenerator:
    """
    Synthesizes multi-stage data quality checks, outlier detection,
    and missing value audits into comprehensive telemetry reports.
    """

    @classmethod
    def generate(
        cls,
        total_processed: int,
        valid_records: int,
        invalid_records: int,
        duplicates: int,
        outliers: int,
        clean_records: int,
        needs_review: int,
        quality_scores: List[float],
        missing_audit: Optional[Dict[str, Any]] = None,
        source: str = "SERPAPI",
        run_id: Optional[int] = None
    ) -> Dict[str, Any]:
        avg_score = round(sum(quality_scores) / len(quality_scores), 2) if quality_scores else 0.0

        if avg_score >= 90.0:
            status = "healthy"
        elif avg_score >= 75.0:
            status = "good"
        elif avg_score >= 50.0:
            status = "warning"
        else:
            status = "critical"

        report = {
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "status": status,
            "records_processed": total_processed,
            "valid": valid_records,
            "invalid": invalid_records,
            "duplicates": duplicates,
            "outliers": outliers,
            "clean_records": clean_records,
            "records_requiring_review": needs_review,
            "quality_score": avg_score,
            "quality_category": (
                "Excellent" if avg_score >= 90.0 else
                "Good" if avg_score >= 75.0 else
                "Needs Review" if avg_score >= 50.0 else "Poor"
            ),
            "missing_fields": missing_audit or {}
        }
        return report

    @classmethod
    def format_console_summary(cls, report: Dict[str, Any]) -> str:
        lines = [
            "==================================================",
            "          AIRFAIR DATA QUALITY REPORT            ",
            "==================================================",
            f" Timestamp:        {report.get('timestamp')}",
            f" Status:           {report.get('status', '').upper()}",
            f" Source:           {report.get('source')}",
            "--------------------------------------------------",
            f" Collected:        {report.get('records_processed')}",
            f" Valid:            {report.get('valid')}",
            f" Invalid:          {report.get('invalid')}",
            f" Duplicates:       {report.get('duplicates')}",
            f" Outliers:         {report.get('outliers')}",
            f" Clean:            {report.get('clean_records')}",
            f" Needs Review:     {report.get('records_requiring_review')}",
            "--------------------------------------------------",
            f" Avg Quality Score: {report.get('quality_score')} / 100 ({report.get('quality_category')})",
            "=================================================="
        ]
        return "\n".join(lines)
