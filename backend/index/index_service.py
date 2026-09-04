from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from backend.database.models import AirfarePriceIndex, FareDailySummary, Route, Airline
from backend.index.baseline_service import BaselineService
from backend.index.movement_service import MovementService
from backend.index.index_calculator import IndexCalculator
from backend.schemas.schemas import AirfareIndexSummaryResponse, AirfareIndexHistoryItem, IndexPoint


class IndexService:
    """
    Serves corridor and carrier-specific Airfare Price Index analytics directly
    from Supabase PostgreSQL, ensuring full provenance and zero fabrication.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_corridor_index(
        self,
        origin: str,
        destination: str,
        days: int = 30,
        airline: Optional[str] = None
    ) -> AirfareIndexSummaryResponse:
        origin_clean = origin.strip().upper()
        destination_clean = destination.strip().upper()

        route = (
            self.db.query(Route)
            .filter(Route.origin == origin_clean, Route.destination == destination_clean)
            .first()
        )

        if not route:
            return AirfareIndexSummaryResponse(
                origin=origin_clean,
                destination=destination_clean,
                period_days=days,
                available_days=0,
                coverage_percentage=0.0,
                baseline_fare=0.0,
                current_fare=0.0,
                index_value=100.0,
                percentage_change=0.0,
                movement="INSUFFICIENT_DATA",
                price_band="INSUFFICIENT_DATA",
                reliability="INSUFFICIENT",
                observation_count=0,
                message=f"Route {origin_clean} -> {destination_clean} is not currently monitored."
            )

        # Resolve airline if provided
        airline_id = None
        airline_code = None
        if airline:
            air_clean = airline.strip().upper()
            air_obj = self.db.query(Airline).filter(
                (Airline.code == air_clean) | (func.upper(Airline.name) == air_clean)
            ).first()
            if air_obj:
                airline_id = air_obj.id
                airline_code = air_obj.code

        # Check cached airfare_price_index records first
        start_date = date.today() - timedelta(days=days)
        index_query = (
            self.db.query(AirfarePriceIndex)
            .filter(
                AirfarePriceIndex.route_id == route.id,
                AirfarePriceIndex.observation_date >= start_date
            )
        )
        if airline_id:
            index_query = index_query.filter(AirfarePriceIndex.airline_id == airline_id)
        else:
            index_query = index_query.filter(AirfarePriceIndex.airline_id.is_(None))

        index_records = index_query.order_by(AirfarePriceIndex.observation_date.asc()).all()

        if index_records:
            latest = index_records[-1]
            avail_days = len(index_records)
            tot_obs = sum(r.observation_count for r in index_records)
            cov_pct = IndexCalculator.calculate_coverage(avail_days, days)
            rel = IndexCalculator.determine_reliability(avail_days, tot_obs, cov_pct)

            return AirfareIndexSummaryResponse(
                origin=origin_clean,
                destination=destination_clean,
                airline_code=airline_code,
                period_days=days,
                available_days=avail_days,
                coverage_percentage=cov_pct,
                baseline_fare=float(latest.baseline_fare),
                current_fare=float(latest.current_fare),
                index_value=float(latest.index_value),
                percentage_change=float(latest.percentage_change),
                movement=latest.movement,
                price_band=latest.price_band,
                reliability=rel,
                observation_count=tot_obs
            )

        # Compute on-the-fly from fare_daily_summary if airfare_price_index has not yet run
        sum_query = (
            self.db.query(FareDailySummary)
            .filter(
                FareDailySummary.route_id == route.id,
                FareDailySummary.observation_date >= start_date
            )
        )
        if airline_id:
            sum_query = sum_query.filter(FareDailySummary.airline_id == airline_id)

        summaries = sum_query.order_by(FareDailySummary.observation_date.asc()).all()

        if not summaries:
            return AirfareIndexSummaryResponse(
                origin=origin_clean,
                destination=destination_clean,
                airline_code=airline_code,
                period_days=days,
                available_days=0,
                coverage_percentage=0.0,
                baseline_fare=0.0,
                current_fare=0.0,
                index_value=100.0,
                percentage_change=0.0,
                movement="INSUFFICIENT_DATA",
                price_band="INSUFFICIENT_DATA",
                reliability="INSUFFICIENT",
                observation_count=0,
                message="No observation records found for the requested period."
            )

        # Group by observation_date
        by_date: Dict[date, List[FareDailySummary]] = {}
        for s in summaries:
            by_date.setdefault(s.observation_date, []).append(s)

        date_list = sorted(by_date.keys())
        daily_averages = []
        tot_obs = 0

        for d in date_list:
            items = by_date[d]
            w_sum = sum(float(i.average_fare) * i.observation_count for i in items)
            w_cnt = sum(i.observation_count for i in items)
            day_avg = round(w_sum / w_cnt, 2)
            daily_averages.append((d, day_avg, w_cnt))
            tot_obs += w_cnt

        all_fares = [avg for _, avg, _ in daily_averages]
        baseline = BaselineService.calculate_baseline(all_fares, min_observations=1)

        if baseline is None or not daily_averages:
            return AirfareIndexSummaryResponse(
                origin=origin_clean,
                destination=destination_clean,
                airline_code=airline_code,
                period_days=days,
                available_days=len(date_list),
                coverage_percentage=IndexCalculator.calculate_coverage(len(date_list), days),
                baseline_fare=0.0,
                current_fare=0.0,
                index_value=100.0,
                percentage_change=0.0,
                movement="INSUFFICIENT_DATA",
                price_band="INSUFFICIENT_DATA",
                reliability="INSUFFICIENT",
                observation_count=tot_obs
            )

        latest_date, latest_avg, _ = daily_averages[-1]
        prev_avg = daily_averages[-2][1] if len(daily_averages) > 1 else None

        idx_val = IndexCalculator.calculate_index(latest_avg, baseline) or 100.0
        pct_chg, mov = MovementService.calculate_price_change(latest_avg, prev_avg)
        band = MovementService.get_price_band(idx_val)
        avail_days = len(date_list)
        cov_pct = IndexCalculator.calculate_coverage(avail_days, days)
        rel = IndexCalculator.determine_reliability(avail_days, tot_obs, cov_pct)

        return AirfareIndexSummaryResponse(
            origin=origin_clean,
            destination=destination_clean,
            airline_code=airline_code,
            period_days=days,
            available_days=avail_days,
            coverage_percentage=cov_pct,
            baseline_fare=baseline,
            current_fare=latest_avg,
            index_value=idx_val,
            percentage_change=pct_chg,
            movement=mov,
            price_band=band,
            reliability=rel,
            observation_count=tot_obs
        )

    def get_corridor_index_history(
        self,
        origin: str,
        destination: str,
        days: int = 30,
        airline: Optional[str] = None
    ) -> List[AirfareIndexHistoryItem]:
        origin_clean = origin.strip().upper()
        destination_clean = destination.strip().upper()

        route = (
            self.db.query(Route)
            .filter(Route.origin == origin_clean, Route.destination == destination_clean)
            .first()
        )
        if not route:
            return []

        airline_id = None
        if airline:
            air_clean = airline.strip().upper()
            air_obj = self.db.query(Airline).filter(
                (Airline.code == air_clean) | (func.upper(Airline.name) == air_clean)
            ).first()
            if air_obj:
                airline_id = air_obj.id

        start_date = date.today() - timedelta(days=days)

        # Check airfare_price_index first
        idx_query = (
            self.db.query(AirfarePriceIndex)
            .filter(
                AirfarePriceIndex.route_id == route.id,
                AirfarePriceIndex.observation_date >= start_date
            )
        )
        if airline_id:
            idx_query = idx_query.filter(AirfarePriceIndex.airline_id == airline_id)
        else:
            idx_query = idx_query.filter(AirfarePriceIndex.airline_id.is_(None))

        idx_records = idx_query.order_by(AirfarePriceIndex.observation_date.asc()).all()

        if idx_records:
            return [
                AirfareIndexHistoryItem(
                    date=r.observation_date.isoformat(),
                    fare=float(r.current_fare),
                    index=float(r.index_value),
                    percentage_change=float(r.percentage_change),
                    movement=r.movement,
                    price_band=r.price_band,
                    observation_count=r.observation_count
                )
                for r in idx_records
            ]

        # On-the-fly calculation from fare_daily_summary
        sum_query = (
            self.db.query(FareDailySummary)
            .filter(
                FareDailySummary.route_id == route.id,
                FareDailySummary.observation_date >= start_date
            )
        )
        if airline_id:
            sum_query = sum_query.filter(FareDailySummary.airline_id == airline_id)

        summaries = sum_query.order_by(FareDailySummary.observation_date.asc()).all()
        if not summaries:
            return []

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
            return []

        history = []
        for i, (d, fare, cnt) in enumerate(daily_series):
            prev_fare = daily_series[i - 1][1] if i > 0 else None
            idx_val = IndexCalculator.calculate_index(fare, baseline) or 100.0
            pct_chg, mov = MovementService.calculate_price_change(fare, prev_fare)
            band = MovementService.get_price_band(idx_val)

            history.append(AirfareIndexHistoryItem(
                date=d.isoformat(),
                fare=fare,
                index=idx_val,
                percentage_change=pct_chg,
                movement=mov,
                price_band=band,
                observation_count=cnt
            ))

        return history
