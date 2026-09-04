from typing import List, Dict, Any, Tuple
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database.models import Airline, Route, FareQuote, CollectionRun
from backend.config.sources import IATA_CITY_MAP, AIRLINE_CODE_MAP


class FareIngestionService:
    """
    Handles atomic batch insertion of validated, deduplicated airfare records into Supabase PostgreSQL.
    Resolves foreign keys for airlines and routes gracefully.
    """

    def __init__(self, db: Session):
        self.db = db

    def _resolve_airline_id(self, code: str) -> int:
        airline = self.db.query(Airline).filter(Airline.code == code).first()
        if airline:
            return airline.id

        # Insert new airline if not already registered
        official_name = AIRLINE_CODE_MAP.get(code, f"Airline {code}")
        new_airline = Airline(
            name=official_name,
            code=code,
            country="India",
            is_active=True
        )
        self.db.add(new_airline)
        self.db.flush()
        return new_airline.id

    def _resolve_route_id(self, origin: str, destination: str) -> int:
        route = self.db.query(Route).filter(
            Route.origin == origin,
            Route.destination == destination
        ).first()
        if route:
            return route.id

        # Insert new corridor if not yet existing
        orig_city = IATA_CITY_MAP.get(origin, origin)
        dest_city = IATA_CITY_MAP.get(destination, destination)
        new_route = Route(
            origin=origin,
            destination=destination,
            origin_city=orig_city,
            destination_city=dest_city,
            is_active=True
        )
        self.db.add(new_route)
        self.db.flush()
        return new_route.id

    def ingest_batch(self, records: List[Dict[str, Any]]) -> Tuple[int, List[str]]:
        """
        Inserts a list of validated quote records in an atomic transaction.
        Returns (inserted_count, errors).
        """
        if not records:
            return 0, []

        inserted_count = 0
        errors = []

        try:
            fare_entities = []
            for r in records:
                try:
                    airline_id = self._resolve_airline_id(r["airline_code"])
                    route_id = self._resolve_route_id(r["route_origin"], r["route_destination"])

                    flight_date = datetime.strptime(str(r["flight_date"])[:10], "%Y-%m-%d").date()
                    scraped_at = datetime.fromisoformat(str(r["scraped_at"]).replace("Z", "+00:00"))

                    fare_obj = FareQuote(
                        airline_id=airline_id,
                        route_id=route_id,
                        flight_date=flight_date,
                        scraped_at=scraped_at,
                        advance_purchase_window=r["advance_purchase_window"],
                        fare_class=r.get("fare_class", "ECONOMY"),
                        base_fare=r["base_fare"],
                        taxes=r.get("taxes", 0.0),
                        user_development_fee=r.get("user_development_fee", 0.0),
                        convenience_fee=r.get("convenience_fee", 0.0),
                        total_fare=r["total_fare"],
                        currency=r.get("currency", "INR"),
                        source=r.get("source", "AIRLINE"),
                        source_url=r.get("source_url", ""),
                        availability_status=r.get("availability_status", "AVAILABLE")
                    )
                    fare_entities.append(fare_obj)
                except Exception as row_err:
                    errors.append(f"Entity preparation failed for {r.get('airline_code')}: {str(row_err)}")

            if fare_entities:
                self.db.add_all(fare_entities)
                self.db.commit()
                inserted_count = len(fare_entities)

        except Exception as batch_err:
            self.db.rollback()
            errors.append(f"Batch transaction commit failed: {str(batch_err)}")
            inserted_count = 0

        return inserted_count, errors
