from typing import List, Dict, Any, Optional
from datetime import datetime, date
import statistics
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.database.models import FareDailySummary, Route, Airline, FareQuote


class AggregationService:
    """
    Computes daily statistical aggregations from cleaned historical airfare observations
    and maintains the idempotent 'fare_daily_summary' analytical dataset.
    """

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def calculate_trend(current_avg: float, previous_avg: Optional[float], threshold_pct: float = 2.0) -> str:
        """
        Calculates observed historical price direction without AI/ML prediction claims.
        """
        if previous_avg is None or previous_avg <= 0:
            return "STABLE"

        pct_diff = ((current_avg - previous_avg) / previous_avg) * 100.0
        if pct_diff > threshold_pct:
            return "INCREASING"
        elif pct_diff < -threshold_pct:
            return "DECREASING"
        else:
            return "STABLE"

    def aggregate_records(
        self,
        cleaned_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Groups cleaned records by (route, airline, flight_date, observation_date)
        and computes min, max, average, median, count, and quality score.
        """
        if not cleaned_records:
            return []

        # Route and Airline cache to minimize queries
        routes = {f"{r.origin}-{r.destination}": r.id for r in self.db.query(Route).all()}
        airlines = {a.code: a.id for a in self.db.query(Airline).all()}

        # Grouping key: (route_id, airline_id, flight_date, observation_date)
        groups: Dict[tuple, List[Dict[str, Any]]] = {}

        for rec in cleaned_records:
            orig = rec.get("origin") or rec.get("route_origin")
            dest = rec.get("destination") or rec.get("route_destination")
            route_key = f"{orig}-{dest}"
            route_id = routes.get(route_key)
            if not route_id:
                # Find or skip
                continue

            air_code = rec.get("airline_code")
            airline_id = airlines.get(air_code)

            fdate_str = str(rec.get("flight_date"))[:10]
            flight_dt = datetime.strptime(fdate_str, "%Y-%m-%d").date()

            scraped_str = str(rec.get("scraped_at") or rec.get("collected_at"))[:10]
            obs_dt = datetime.strptime(scraped_str, "%Y-%m-%d").date() if scraped_str else date.today()

            group_key = (route_id, airline_id, flight_dt, obs_dt)
            groups.setdefault(group_key, []).append(rec)

        summaries = []
        for (route_id, airline_id, flight_dt, obs_dt), recs in groups.items():
            fares = [float(r.get("total_fare", 0)) for r in recs if float(r.get("total_fare", 0)) > 0]
            if not fares:
                continue

            scores = [float(r.get("quality_score", 100.0)) for r in recs]
            min_fare = round(min(fares), 2)
            max_fare = round(max(fares), 2)
            avg_fare = round(sum(fares) / len(fares), 2)
            med_fare = round(statistics.median(fares), 2)
            obs_count = len(fares)
            avg_quality = round(sum(scores) / len(scores), 2) if scores else 100.0

            # Determine observed trend by checking prior day's summary
            prior_summary = (
                self.db.query(FareDailySummary)
                .filter(
                    FareDailySummary.route_id == route_id,
                    FareDailySummary.airline_id == airline_id,
                    FareDailySummary.flight_date == flight_dt,
                    FareDailySummary.observation_date < obs_dt
                )
                .order_by(FareDailySummary.observation_date.desc())
                .first()
            )
            prev_avg = float(prior_summary.average_fare) if prior_summary else None
            trend = self.calculate_trend(avg_fare, prev_avg)

            summaries.append({
                "route_id": route_id,
                "airline_id": airline_id,
                "flight_date": flight_dt,
                "observation_date": obs_dt,
                "min_fare": min_fare,
                "max_fare": max_fare,
                "average_fare": avg_fare,
                "median_fare": med_fare,
                "observation_count": obs_count,
                "quality_score": avg_quality,
                "trend": trend
            })

        return summaries

    def persist_summaries(self, summaries: List[Dict[str, Any]]) -> int:
        """
        Upserts daily summaries into Supabase PostgreSQL idempotently.
        """
        if not summaries:
            return 0

        upserted_count = 0
        for s in summaries:
            existing = (
                self.db.query(FareDailySummary)
                .filter(
                    FareDailySummary.route_id == s["route_id"],
                    FareDailySummary.airline_id == s["airline_id"],
                    FareDailySummary.flight_date == s["flight_date"],
                    FareDailySummary.observation_date == s["observation_date"]
                )
                .first()
            )

            if existing:
                existing.min_fare = s["min_fare"]
                existing.max_fare = s["max_fare"]
                existing.average_fare = s["average_fare"]
                existing.median_fare = s["median_fare"]
                existing.observation_count = s["observation_count"]
                existing.quality_score = s["quality_score"]
                existing.trend = s["trend"]
            else:
                summary_obj = FareDailySummary(
                    route_id=s["route_id"],
                    airline_id=s["airline_id"],
                    flight_date=s["flight_date"],
                    observation_date=s["observation_date"],
                    min_fare=s["min_fare"],
                    max_fare=s["max_fare"],
                    average_fare=s["average_fare"],
                    median_fare=s["median_fare"],
                    observation_count=s["observation_count"],
                    quality_score=s["quality_score"],
                    trend=s["trend"]
                )
                self.db.add(summary_obj)
            upserted_count += 1

        self.db.commit()
        return upserted_count
