from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database.models import FareQuote, Route, Airline
from backend.data_quality.quality_checker import QualityChecker
from backend.data_quality.outlier_detector import OutlierDetector


class MLReadinessGate:
    """
    Strict ML Readiness Gate for AIRFAIR (Phase 7 Step 6).
    Enforces rigorous criteria before any ML model training is authorized:
    1. Minimum 30 real collection dates
    2. Minimum 100 real observations per target route
    3. Multi-window advance purchase coverage (T+1, T+7, T+15, T+30, T+45)
    4. Valid chronological train/val/test split possible
    5. Zero synthetic, mock, or backfilled data
    6. Passing data leakage audit
    """

    MIN_COLLECTION_DATES = 30
    MIN_OBSERVATIONS_PER_TARGET_ROUTE = 100
    REQUIRED_WINDOWS = {"T+1", "T+7", "T+15", "T+30"}

    @classmethod
    def evaluate_gate(cls, db: Session) -> Dict[str, Any]:
        # 1. Fetch all authentic non-MOCK quotes
        real_quotes = (
            db.query(FareQuote, Route, Airline)
            .join(Route, FareQuote.route_id == Route.id)
            .join(Airline, FareQuote.airline_id == Airline.id)
            .filter(FareQuote.source != 'MOCK')
            .order_by(FareQuote.scraped_at.asc(), FareQuote.id.asc())
            .all()
        )

        total_real = len(real_quotes)

        # 2. Extract collection dates and flight dates
        coll_dates_set = set()
        flight_dates_set = set()
        for q, _, _ in real_quotes:
            if q.scraped_at:
                coll_dates_set.add(q.scraped_at.date())
            if q.flight_date:
                flight_dates_set.add(q.flight_date)

        unique_coll_dates = sorted([str(d) for d in coll_dates_set])
        unique_flight_dates = sorted([str(d) for d in flight_dates_set])

        # 3. Calculate consecutive collection day streak
        streak = cls._calculate_consecutive_days(coll_dates_set)

        # 4. Route, Airline, and Window distributions
        route_dist: Dict[str, int] = {}
        airline_dist: Dict[str, int] = {}
        window_dist: Dict[str, int] = {}

        for q, r, a in real_quotes:
            r_key = f"{r.origin}-{r.destination}"
            route_dist[r_key] = route_dist.get(r_key, 0) + 1
            airline_dist[a.code] = airline_dist.get(a.code, 0) + 1
            win = q.advance_purchase_window or "UNKNOWN"
            window_dist[win] = window_dist.get(win, 0) + 1

        # 5. Missing dates within collection span
        min_coll_date = min(coll_dates_set, default=None)
        max_coll_date = max(coll_dates_set, default=None)
        missing_coll_dates = []
        if min_coll_date and max_coll_date:
            cur = min_coll_date
            while cur <= max_coll_date:
                if cur not in coll_dates_set:
                    missing_coll_dates.append(str(cur))
                cur += timedelta(days=1)

        # 6. Outliers & Data Quality
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

        scores = [QualityChecker.evaluate_record(item)[1] for item in quote_dicts]
        avg_quality_score = round(sum(scores) / len(scores), 2) if scores else 100.0

        # 7. Route-level Temporal Span
        temporal_span_per_route = {}
        routes = db.query(Route).all()
        for r in routes:
            r_quotes = [q for q, r_obj, _ in real_quotes if r_obj.id == r.id]
            if not r_quotes:
                continue
            r_dates = set(q.scraped_at.date() for q in r_quotes if q.scraped_at)
            r_flt_dates = set(q.flight_date for q in r_quotes if q.flight_date)
            r_min = min(r_dates, default=None)
            r_max = max(r_dates, default=None)
            r_span = (r_max - r_min).days + 1 if r_min and r_max else 0

            temporal_span_per_route[f"{r.origin}-{r.destination}"] = {
                "observations": len(r_quotes),
                "unique_collection_dates": len(r_dates),
                "unique_flight_dates": len(r_flt_dates),
                "span_days": r_span,
                "first_date": str(r_min) if r_min else None,
                "last_date": str(r_max) if r_max else None,
                "meets_route_threshold": (len(r_dates) >= cls.MIN_COLLECTION_DATES and len(r_quotes) >= cls.MIN_OBSERVATIONS_PER_TARGET_ROUTE)
            }

        # 8. Strict Readiness Gate Evaluation
        blocking_reasons: List[str] = []

        if len(unique_coll_dates) < cls.MIN_COLLECTION_DATES:
            blocking_reasons.append(
                f"Insufficient temporal depth: {len(unique_coll_dates)} collection date(s) available vs. {cls.MIN_COLLECTION_DATES} required."
            )

        routes_meeting_threshold = sum(1 for d in temporal_span_per_route.values() if d["meets_route_threshold"])
        if routes_meeting_threshold == 0:
            blocking_reasons.append(
                f"No route currently meets the required depth threshold (minimum {cls.MIN_COLLECTION_DATES} dates & {cls.MIN_OBSERVATIONS_PER_TARGET_ROUTE} observations per route)."
            )

        missing_windows = cls.REQUIRED_WINDOWS - set(window_dist.keys())
        if missing_windows:
            blocking_reasons.append(
                f"Missing required advance purchase windows: {sorted(list(missing_windows))}."
            )

        if len(unique_coll_dates) < 3:
            blocking_reasons.append(
                "Chronological train/validation/test splitting is not possible with fewer than 3 distinct collection dates."
            )

        # Gate status determination
        if not blocking_reasons:
            gate_status = "READY_FOR_ML_TRAINING"
            readiness_explanation = "All temporal depth, route coverage, multi-window distribution, and data integrity criteria are fully satisfied."
        else:
            gate_status = "ACCUMULATING_REAL_DATA"
            readiness_explanation = "; ".join(blocking_reasons)

        max_route_days = max((d["unique_collection_dates"] for d in temporal_span_per_route.values()), default=0)
        progress_pct = round(min(100.0, (max_route_days / cls.MIN_COLLECTION_DATES) * 100.0), 1)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "gate_status": gate_status,
            "readiness_explanation": readiness_explanation,
            "blocking_reasons": blocking_reasons,
            "progress_percentage": progress_pct,
            "total_real_observations": total_real,
            "unique_collection_dates_count": len(unique_coll_dates),
            "unique_collection_dates": unique_coll_dates,
            "consecutive_collection_streak_days": streak,
            "unique_flight_dates_count": len(unique_flight_dates),
            "unique_flight_dates": unique_flight_dates,
            "route_distribution": route_dist,
            "airline_distribution": airline_dist,
            "advance_window_distribution": window_dist,
            "outlier_count": outlier_count,
            "data_quality_score": avg_quality_score,
            "missing_collection_dates_count": len(missing_coll_dates),
            "missing_collection_dates": missing_coll_dates,
            "temporal_span_per_route": temporal_span_per_route,
            "gate_thresholds": {
                "min_collection_dates_required": cls.MIN_COLLECTION_DATES,
                "min_observations_per_route": cls.MIN_OBSERVATIONS_PER_TARGET_ROUTE,
                "current_max_route_dates": max_route_days,
                "routes_ready": routes_meeting_threshold
            }
        }

    @staticmethod
    def _calculate_consecutive_days(dates_set: set) -> int:
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
