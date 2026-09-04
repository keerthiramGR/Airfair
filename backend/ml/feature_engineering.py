from typing import List, Dict, Any, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session
from backend.database.models import AirfarePriceIndex, Route
from backend.data_quality.outlier_detector import OutlierDetector


class MLFeatureEngineer:
    """
    ML Feature Engineering Engine (Phase 7 Step 5).
    Transforms raw chronological observations into clean, leak-free feature vectors.
    Strictly forbids future-data leakage by calculating lag and index features
    using only prior historical observations.
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def engineer_features(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Processes chronological records and engineers temporal, calendar, lag, and index features.
        Assumes input is sorted chronologically by observation_timestamp.
        """
        # Ensure strict chronological sort
        sorted_records = sorted(
            records,
            key=lambda x: (x["observation_timestamp"], x["id"])
        )

        # Preload AirfarePriceIndex lookup if DB session is available
        index_lookup = {}
        if self.db:
            indexes = self.db.query(AirfarePriceIndex).all()
            for idx in indexes:
                key = (idx.route_id, idx.airline_id, idx.observation_date)
                index_lookup[key] = {
                    "index_value": float(idx.index_value) if idx.index_value is not None else 100.0,
                    "movement": idx.movement,
                    "price_band": idx.price_band
                }

        # Compute IQR outlier bounds per corridor
        outlier_flags = OutlierDetector.flag_batch_outliers([
            {
                "airline_code": r["airline_code"],
                "origin": r["origin"],
                "destination": r["destination"],
                "flight_date": str(r["flight_date"]),
                "total_fare": float(r["total_fare"]),
                "scraped_at": r["observation_timestamp"].isoformat(),
                "currency": r["currency"]
            }
            for r in sorted_records
        ])
        is_outlier_map = {
            (r["origin"], r["destination"], str(r["flight_date"]), float(r["total_fare"])): f.get("is_outlier", False)
            for r, f in zip(sorted_records, outlier_flags)
        }

        # Track historical observations state to calculate strictly backward-looking lag features
        # Key: (route, airline_code, flight_date) -> latest observed total_fare
        carrier_flight_history = {}

        feature_dataset = []

        for rec in sorted_records:
            obs_dt = rec["observation_timestamp"]
            obs_date = rec["observation_date"]
            flt_date = rec["flight_date"]

            # 1. Temporal & Advance Lead Days
            days_until_flight = (flt_date - obs_date).days
            # Safe safeguard against corrupted future observations
            if days_until_flight < 0:
                days_until_flight = 0

            # 2. Calendar Features
            day_of_week_flt = flt_date.weekday()  # 0 = Monday, 6 = Sunday
            is_weekend_flt = 1 if day_of_week_flt in (5, 6) else 0
            day_of_week_obs = obs_date.weekday()
            is_weekend_obs = 1 if day_of_week_obs in (5, 6) else 0
            month_flt = flt_date.month
            day_of_month_flt = flt_date.day

            # 3. Lag Feature (Strict Backward Memory - Zero Future Leakage)
            hist_key = (rec["route"], rec["airline_code"], str(flt_date))
            prev_fare = carrier_flight_history.get(hist_key)

            if prev_fare is not None:
                price_delta_prev = round(rec["total_fare"] - prev_fare, 2)
                price_delta_pct_prev = round(((rec["total_fare"] - prev_fare) / prev_fare) * 100.0, 2)
            else:
                price_delta_prev = None
                price_delta_pct_prev = None

            # Update history AFTER extracting lag (strict no-leakage)
            carrier_flight_history[hist_key] = rec["total_fare"]

            # 4. Price Index Context (strictly on or before observation date)
            idx_key = (rec["route_id"], None, obs_date)  # corridor index
            idx_info = index_lookup.get(idx_key)
            if idx_info:
                index_val = idx_info["index_value"]
                observed_trend = idx_info["movement"]
                price_band = idx_info["price_band"]
            else:
                index_val = None
                observed_trend = "UNKNOWN"
                price_band = "UNKNOWN"

            # 5. Outlier Flag
            outlier_key = (rec["origin"], rec["destination"], str(flt_date), rec["total_fare"])
            is_outlier = is_outlier_map.get(outlier_key, False)

            # Assemble clean feature vector
            feature_row = {
                "quote_id": rec["id"],
                "origin": rec["origin"],
                "destination": rec["destination"],
                "route": rec["route"],
                "airline_code": rec["airline_code"],
                "airline_name": rec["airline_name"],
                "flight_date": str(flt_date),
                "observation_timestamp": obs_dt.isoformat(),
                "observation_date": str(obs_date),
                "days_until_flight": days_until_flight,
                "advance_purchase_window": rec["advance_purchase_window"],
                "fare_class": rec["fare_class"],
                "flight_day_of_week": day_of_week_flt,
                "is_flight_weekend": is_weekend_flt,
                "observation_day_of_week": day_of_week_obs,
                "is_observation_weekend": is_weekend_obs,
                "flight_month": month_flt,
                "flight_day_of_month": day_of_month_flt,
                "base_fare": rec["base_fare"],
                "taxes": rec["taxes"],
                "user_development_fee": rec["user_development_fee"],
                "convenience_fee": rec["convenience_fee"],
                "total_fare": rec["total_fare"],
                "previous_observed_fare": prev_fare,
                "price_delta_vs_previous": price_delta_prev,
                "price_delta_pct_vs_previous": price_delta_pct_prev,
                "route_index_value": index_val,
                "route_observed_trend": observed_trend,
                "route_price_band": price_band,
                "is_outlier": is_outlier,
                "source": rec["source"],
                "currency": rec["currency"]
            }
            feature_dataset.append(feature_row)

        return feature_dataset
