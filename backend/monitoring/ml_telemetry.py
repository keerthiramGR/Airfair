from typing import Dict, Any, List, Optional, Set
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database.models import FareQuote, Route, Airline, CollectionRun, FareDailySummary
from backend.data_quality.quality_checker import QualityChecker
from backend.data_quality.outlier_detector import OutlierDetector


class MLReadinessService:
    """
    ML Dataset Readiness & Temporal Depth Monitoring Service (Phase 7 Step 4).
    Audits the real accumulated dataset in Supabase PostgreSQL for long-term ML forecasting readiness,
    tracking temporal depth, consecutive collection day streaks, missing observation calendar days,
    corridor coverage, carrier distribution, and advance purchase window matrix.
    """

    MIN_TEMPORAL_DEPTH_DAYS = 30
    MIN_OBSERVATIONS_PER_CORRIDOR = 100
    INTERMEDIATE_ACCUMULATION_DAYS = 3

    @classmethod
    def classify_route_readiness(cls, unique_dates_count: int, observation_count: int) -> str:
        """
        Classifies corridor readiness into transparent states:
        - READY_FOR_DATASET_PREPARATION: >= 30 collection dates and >= 100 observations
        - ACCUMULATING_DATA: >= 3 collection dates
        - INSUFFICIENT_DATA: < 3 collection dates
        """
        if unique_dates_count >= cls.MIN_TEMPORAL_DEPTH_DAYS and observation_count >= cls.MIN_OBSERVATIONS_PER_CORRIDOR:
            return "READY_FOR_DATASET_PREPARATION"
        elif unique_dates_count >= cls.INTERMEDIATE_ACCUMULATION_DAYS:
            return "ACCUMULATING_DATA"
        else:
            return "INSUFFICIENT_DATA"

    @classmethod
    def calculate_consecutive_days_streak(cls, dates_set: Set[date]) -> int:
        if not dates_set:
            return 0
        sorted_dates = sorted(dates_set)
        max_streak = 1
        current_streak = 1
        for i in range(1, len(sorted_dates)):
            if sorted_dates[i] == sorted_dates[i - 1] + timedelta(days=1):
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 1
        return max_streak

    @classmethod
    def get_readiness_report(cls, db: Session) -> Dict[str, Any]:
        # 1. Real quotes (source != 'MOCK')
        real_quotes = (
            db.query(FareQuote, Route, Airline)
            .join(Route, FareQuote.route_id == Route.id)
            .join(Airline, FareQuote.airline_id == Airline.id)
            .filter(FareQuote.source != 'MOCK')
            .all()
        )
        total_real = len(real_quotes)

        # 2. Unique collection dates & flight dates
        all_coll_dates_set = set()
        all_flight_dates_set = set()
        for q, _, _ in real_quotes:
            if q.scraped_at:
                all_coll_dates_set.add(q.scraped_at.date())
            if q.flight_date:
                all_flight_dates_set.add(q.flight_date)

        unique_collection_dates = sorted([str(d) for d in all_coll_dates_set])
        unique_flight_dates = sorted([str(d) for d in all_flight_dates_set])

        # 3. Route & Airline breakdown
        route_stats: Dict[str, int] = {}
        airline_stats: Dict[str, Dict[str, Any]] = {}
        window_stats: Dict[str, int] = {}

        for q, r, a in real_quotes:
            r_key = f"{r.origin}-{r.destination}"
            route_stats[r_key] = route_stats.get(r_key, 0) + 1

            if a.code not in airline_stats:
                airline_stats[a.code] = {"name": a.name, "observations": 0}
            airline_stats[a.code]["observations"] += 1

            win = q.advance_purchase_window or "UNKNOWN"
            window_stats[win] = window_stats.get(win, 0) + 1

        # 4. Outliers & Data Quality
        quote_dicts = [
            {
                "airline_code": a.code,
                "origin": r.origin,
                "destination": r.destination,
                "flight_date": str(q.flight_date),
                "total_fare": float(q.total_fare),
                "scraped_at": q.scraped_at.isoformat() if q.scraped_at else None,
                "currency": q.currency
            }
            for q, r, a in real_quotes
        ]
        flagged = OutlierDetector.flag_batch_outliers(quote_dicts)
        outlier_count = sum(1 for item in flagged if item.get("is_outlier"))

        scores = [
            QualityChecker.evaluate_record(item)[1]
            for item in quote_dicts
        ]
        avg_quality_score = round(sum(scores) / len(scores), 2) if scores else 100.0

        # 5. Per-Route Temporal Depth & Readiness
        routes = db.query(Route).all()
        per_route_depth = {}
        routes_ready_count = 0

        for r in routes:
            r_quotes = [q for q, r_obj, _ in real_quotes if r_obj.id == r.id]
            if not r_quotes:
                continue

            r_obs_dates = set(q.scraped_at.date() for q in r_quotes if q.scraped_at)
            r_flt_dates = set(q.flight_date for q in r_quotes if q.flight_date)
            min_date = min(r_obs_dates, default=None)
            max_date = max(r_obs_dates, default=None)
            span_days = (max_date - min_date).days + 1 if min_date and max_date else 0

            # Missing observation dates within date span
            missing_dates = []
            if min_date and max_date and span_days > 1:
                cur = min_date
                while cur <= max_date:
                    if cur not in r_obs_dates:
                        missing_dates.append(str(cur))
                    cur += timedelta(days=1)

            streak = cls.calculate_consecutive_days_streak(r_obs_dates)
            status = cls.classify_route_readiness(len(r_obs_dates), len(r_quotes))
            if status == "READY_FOR_DATASET_PREPARATION":
                routes_ready_count += 1

            per_route_depth[f"{r.origin}-{r.destination}"] = {
                "observations": len(r_quotes),
                "unique_collection_dates": len(r_obs_dates),
                "unique_flight_dates": len(r_flt_dates),
                "historical_span_days": span_days,
                "first_collection_date": str(min_date) if min_date else None,
                "last_collection_date": str(max_date) if max_date else None,
                "consecutive_collection_streak_days": streak,
                "missing_observation_dates_count": len(missing_dates),
                "missing_observation_dates": missing_dates[:5],  # sample
                "readiness_status": status,
                "is_ml_ready": (status == "READY_FOR_DATASET_PREPARATION")
            }

        # Overall ML Readiness Assessment
        if routes_ready_count > 0:
            overall_status = "READY_FOR_DATASET_PREPARATION"
        elif len(all_coll_dates_set) >= cls.INTERMEDIATE_ACCUMULATION_DAYS:
            overall_status = "ACCUMULATING_DATA"
        else:
            overall_status = "INSUFFICIENT_DATA"

        max_depth = max((d["unique_collection_dates"] for d in per_route_depth.values()), default=0)
        progress_pct = round(min(100.0, (max_depth / cls.MIN_TEMPORAL_DEPTH_DAYS) * 100.0), 1)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_readiness_status": overall_status,
            "dataset_progress_percentage": progress_pct,
            "total_real_observations": total_real,
            "unique_collection_dates_count": len(unique_collection_dates),
            "unique_collection_dates": unique_collection_dates,
            "unique_flight_dates_count": len(unique_flight_dates),
            "unique_flight_dates": unique_flight_dates,
            "corridors_monitored_count": len(route_stats),
            "route_coverage": route_stats,
            "airline_coverage": airline_stats,
            "advance_window_coverage": window_stats,
            "data_quality_score": avg_quality_score,
            "outliers_count": outlier_count,
            "per_route_readiness": per_route_depth,
            "prerequisites": {
                "min_collection_days_required": cls.MIN_TEMPORAL_DEPTH_DAYS,
                "min_observations_per_route": cls.MIN_OBSERVATIONS_PER_CORRIDOR,
                "current_max_route_depth_days": max_depth,
                "routes_ready_for_dataset_prep": routes_ready_count
            }
        }


# Alias for backward compatibility
MLReadinessService.get_telemetry = MLReadinessService.get_readiness_report
MLTelemetryService = MLReadinessService

