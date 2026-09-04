from typing import Dict, Any, List, Optional
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from backend.database.connection import SessionLocal
from backend.database.models import FareDailySummary, AirfarePriceIndex, Route, Airline
from backend.index.baseline_service import BaselineService
from backend.index.movement_service import MovementService
from backend.index.index_calculator import IndexCalculator
from backend.index.index_report import IndexReportGenerator


class IndexGenerationPipeline:
    """
    Orchestrates the Phase 6 Index Generation Pipeline:
    fare_daily_summary -> filter clean observations -> calculate baseline ->
    compute daily index & movement -> assign price band -> idempotent upsert to airfare_price_index.
    """

    def __init__(self, db: Session):
        self.db = db

    def execute_pipeline(
        self,
        route_id: Optional[int] = None,
        days: int = 365
    ) -> Dict[str, Any]:
        started_at = datetime.now(timezone.utc)

        # 1. Fetch available routes
        routes_query = self.db.query(Route)
        if route_id:
            routes_query = routes_query.filter(Route.id == route_id)
        routes = routes_query.all()

        total_upserted = 0
        baseline_stats = {}

        for r in routes:
            # Generate overall route index (airline_id = None)
            count_overall = self._process_route_index(r.id, airline_id=None, days=days)
            total_upserted += count_overall

            # Generate carrier-specific indexes
            carrier_ids = [
                row[0] for row in (
                    self.db.query(FareDailySummary.airline_id)
                    .filter(FareDailySummary.route_id == r.id, FareDailySummary.airline_id.isnot(None))
                    .distinct()
                    .all()
                )
            ]
            for air_id in carrier_ids:
                count_carrier = self._process_route_index(r.id, airline_id=air_id, days=days)
                total_upserted += count_carrier

            baseline_stats[f"{r.origin}-{r.destination}"] = {
                "overall_records": count_overall,
                "carriers": len(carrier_ids)
            }

        self.db.commit()

        duration = (datetime.now(timezone.utc) - started_at).total_seconds()
        report = IndexReportGenerator.generate(
            routes_processed=len(routes),
            records_generated=total_upserted,
            baseline_stats=baseline_stats,
            duration_seconds=duration
        )
        return report

    def _process_route_index(
        self,
        route_id: int,
        airline_id: Optional[int],
        days: int
    ) -> int:
        # Fetch summaries for this route/carrier
        query = (
            self.db.query(FareDailySummary)
            .filter(FareDailySummary.route_id == route_id)
        )
        if airline_id:
            query = query.filter(FareDailySummary.airline_id == airline_id)

        summaries = query.order_by(FareDailySummary.observation_date.asc()).all()
        if not summaries:
            return 0

        # Group by observation_date
        by_date: Dict[date, List[FareDailySummary]] = {}
        for s in summaries:
            by_date.setdefault(s.observation_date, []).append(s)

        date_list = sorted(by_date.keys())
        daily_series = []
        for d in date_list:
            items = by_date[d]
            w_sum = sum(float(i.average_fare) * i.observation_count for i in items)
            w_cnt = sum(i.observation_count for i in items)
            day_avg = round(w_sum / w_cnt, 2)
            daily_series.append((d, day_avg, w_cnt))

        all_fares = [avg for _, avg, _ in daily_series]
        baseline = BaselineService.calculate_baseline(all_fares, min_observations=1)
        if baseline is None:
            return 0

        avail_days = len(date_list)
        coverage_pct = IndexCalculator.calculate_coverage(avail_days, days)
        tot_obs = sum(cnt for _, _, cnt in daily_series)
        reliability = IndexCalculator.determine_reliability(avail_days, tot_obs, coverage_pct)

        upserted_count = 0
        for i, (d, fare, count_val) in enumerate(daily_series):
            prev_fare = daily_series[i - 1][1] if i > 0 else None
            idx_val = IndexCalculator.calculate_index(fare, baseline) or 100.0
            pct_chg, mov = MovementService.calculate_price_change(fare, prev_fare)
            band = MovementService.get_price_band(idx_val)

            # Idempotent upsert check
            existing_query = (
                self.db.query(AirfarePriceIndex)
                .filter(
                    AirfarePriceIndex.route_id == route_id,
                    AirfarePriceIndex.observation_date == d
                )
            )
            if airline_id is None:
                existing_query = existing_query.filter(AirfarePriceIndex.airline_id.is_(None))
            else:
                existing_query = existing_query.filter(AirfarePriceIndex.airline_id == airline_id)

            existing = existing_query.first()

            if existing:
                existing.baseline_fare = baseline
                existing.current_fare = fare
                existing.index_value = idx_val
                existing.percentage_change = pct_chg
                existing.movement = mov
                existing.price_band = band
                existing.observation_count = count_val
                existing.data_coverage = coverage_pct
                existing.reliability = reliability
            else:
                record = AirfarePriceIndex(
                    route_id=route_id,
                    airline_id=airline_id,
                    observation_date=d,
                    baseline_fare=baseline,
                    current_fare=fare,
                    index_value=idx_val,
                    percentage_change=pct_chg,
                    movement=mov,
                    price_band=band,
                    observation_count=count_val,
                    data_coverage=coverage_pct,
                    reliability=reliability
                )
                self.db.add(record)

            upserted_count += 1

        return upserted_count


def run_index_generation_job(route_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Standalone runner for the Index Generation job.
    """
    db = SessionLocal()
    try:
        pipeline = IndexGenerationPipeline(db)
        report = pipeline.execute_pipeline(route_id=route_id)
        print(IndexReportGenerator.format_console_summary(report))
        return report
    finally:
        db.close()


if __name__ == "__main__":
    run_index_generation_job()
