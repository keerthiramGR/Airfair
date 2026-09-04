from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class IndexReportGenerator:
    """
    Generates structured telemetry reports for the Airfare Price Index engine.
    """

    @classmethod
    def generate(
        cls,
        routes_processed: int,
        records_generated: int,
        baseline_stats: Dict[str, Any],
        duration_seconds: float = 0.0
    ) -> Dict[str, Any]:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success" if records_generated > 0 else "completed_no_records",
            "routes_processed": routes_processed,
            "index_records_generated": records_generated,
            "duration_seconds": round(duration_seconds, 2),
            "baseline_stats": baseline_stats
        }

    @classmethod
    def format_console_summary(cls, report: Dict[str, Any]) -> str:
        lines = [
            "==================================================",
            "        AIRFAIR PRICE INDEX GENERATION REPORT     ",
            "==================================================",
            f" Timestamp:             {report.get('timestamp')}",
            f" Status:                {report.get('status', '').upper()}",
            f" Routes Processed:      {report.get('routes_processed')}",
            f" Index Records Upserted:{report.get('index_records_generated')}",
            f" Duration:              {report.get('duration_seconds')}s",
            "=================================================="
        ]
        return "\n".join(lines)
