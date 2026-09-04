from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.database.models import FareQuote, Route, Airline
from backend.validation.fare_validator import FareValidator
from backend.normalization.fare_normalizer import FareNormalizer


class MLDatasetBuilder:
    """
    ML Dataset Extraction & Cleaning Engine (Phase 7 Step 5).
    Extracts authentic, validated airfare observations from Supabase PostgreSQL,
    strictly excluding MOCK data and preserving strict chronological ordering without data leakage.
    """

    def __init__(self, db: Session):
        self.db = db

    def extract_real_observations(self) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extracts verified non-MOCK fare quotes from the database,
        validating integrity and ordering strictly by observation timestamp (scraped_at).
        """
        # Fetch all non-MOCK quotes joined with Route and Airline
        raw_quotes = (
            self.db.query(FareQuote, Route, Airline)
            .join(Route, FareQuote.route_id == Route.id)
            .join(Airline, FareQuote.airline_id == Airline.id)
            .filter(FareQuote.source != 'MOCK')
            .order_by(FareQuote.scraped_at.asc(), FareQuote.id.asc())
            .all()
        )

        total_raw = len(raw_quotes)
        eligible_records: List[Dict[str, Any]] = []
        excluded_records: List[Dict[str, Any]] = []

        for quote, route, airline in raw_quotes:
            # Audit mandatory fields
            if not quote.flight_date:
                excluded_records.append({"id": quote.id, "reason": "Missing flight_date"})
                continue
            if not quote.scraped_at:
                excluded_records.append({"id": quote.id, "reason": "Missing scraped_at timestamp"})
                continue
            if quote.total_fare is None or float(quote.total_fare) <= 0:
                excluded_records.append({"id": quote.id, "reason": "Invalid or non-positive total_fare"})
                continue
            if not route or not route.origin or not route.destination:
                excluded_records.append({"id": quote.id, "reason": "Missing route identifiers"})
                continue
            if not airline or not airline.code:
                excluded_records.append({"id": quote.id, "reason": "Missing airline identifier"})
                continue

            record_dict = {
                "id": quote.id,
                "route_id": route.id,
                "origin": route.origin.upper(),
                "destination": route.destination.upper(),
                "route": f"{route.origin.upper()}-{route.destination.upper()}",
                "airline_id": airline.id,
                "airline_code": airline.code.upper(),
                "airline_name": airline.name,
                "flight_date": quote.flight_date,
                "observation_timestamp": quote.scraped_at,
                "observation_date": quote.scraped_at.date(),
                "advance_purchase_window": quote.advance_purchase_window or "T+7",
                "fare_class": quote.fare_class or "ECONOMY",
                "total_fare": float(quote.total_fare),
                "base_fare": float(quote.base_fare) if quote.base_fare is not None else float(quote.total_fare),
                "taxes": float(quote.taxes) if quote.taxes is not None else 0.0,
                "user_development_fee": float(quote.user_development_fee) if quote.user_development_fee is not None else 0.0,
                "convenience_fee": float(quote.convenience_fee) if quote.convenience_fee is not None else 0.0,
                "currency": quote.currency or "INR",
                "source": quote.source,
                "availability_status": quote.availability_status or "AVAILABLE"
            }
            eligible_records.append(record_dict)

        audit_summary = {
            "total_raw_real_records": total_raw,
            "eligible_records_count": len(eligible_records),
            "excluded_records_count": len(excluded_records),
            "exclusion_reasons": [r["reason"] for r in excluded_records]
        }

        return eligible_records, audit_summary
