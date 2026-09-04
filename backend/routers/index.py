from typing import List, Optional, Union, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import IndexPoint, AirfareIndexSummaryResponse, AirfareIndexHistoryItem
from backend.services.index_service import get_index_data
from backend.index.index_service import IndexService
from backend.jobs.index_generation_job import IndexGenerationPipeline

router = APIRouter(prefix="/api/index", tags=["Index"])


@router.get(
    "",
    summary="Get route airfare index summary or composite series",
    description="Returns corridor Airfare Price Index summary when origin and destination are specified, or national composite index series when omitted."
)
def read_airfare_index(
    origin: Optional[str] = Query(None, description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: Optional[str] = Query(None, description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    days: int = Query(30, ge=1, le=365, description="Historical lookback period in days (e.g. 7, 30, 90)", examples=[30]),
    airline: Optional[str] = Query(None, description="Optional airline code or name filter (e.g. 6E)", examples=["6E"]),
    db: Session = Depends(get_db)
) -> Any:
    if db is None:
        if origin and destination:
            return AirfareIndexSummaryResponse(
                origin=origin.upper(),
                destination=destination.upper(),
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
                observation_count=0
            )
        return get_index_data(days=days, db=None)

    if origin and destination:
        service = IndexService(db)
        return service.get_corridor_index(
            origin=origin,
            destination=destination,
            days=days,
            airline=airline
        )

    return get_index_data(days=days, db=db)


@router.get(
    "/history",
    response_model=List[AirfareIndexHistoryItem],
    summary="Get corridor index history time series",
    description="Retrieve date-wise airfare price index historical series with day-over-day changes, price bands, and observation counts."
)
def read_index_history(
    origin: str = Query("DEL", description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = Query("BOM", description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    days: int = Query(30, ge=1, le=365, description="Historical lookback period in days", examples=[30]),
    airline: Optional[str] = Query(None, description="Optional airline code or name filter (e.g. 6E)", examples=["6E"]),
    db: Session = Depends(get_db)
):
    if db is None:
        return []

    service = IndexService(db)
    return service.get_corridor_index_history(
        origin=origin,
        destination=destination,
        days=days,
        airline=airline
    )


@router.post(
    "/generate",
    summary="Trigger index generation batch job",
    description="Calculates baseline medians, daily index values, price movements, and price bands from daily summaries, upserting to Supabase PostgreSQL."
)
def trigger_index_generation(
    days: int = Query(365, ge=7, le=365),
    db: Session = Depends(get_db)
):
    if db is None:
        return {"status": "offline", "message": "Database not connected"}

    pipeline = IndexGenerationPipeline(db)
    report = pipeline.execute_pipeline(days=days)
    return report
