from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import HistoricalFaresResponse
from backend.historical.historical_service import HistoricalService

router = APIRouter(prefix="/api/historical", tags=["Historical Fares"])


@router.get(
    "/fares",
    response_model=HistoricalFaresResponse,
    summary="Get clean historical airfare observations",
    description="Retrieve date-wise aggregated historical fare observations (min, avg, max, median, count, trend) for a corridor based strictly on real observations."
)
def read_historical_fares(
    origin: str = Query("DEL", description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = Query("BOM", description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    days: int = Query(30, ge=1, le=365, description="Historical lookback window in days", examples=[30]),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)", examples=["2026-08-01"]),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)", examples=["2026-09-03"]),
    airline: Optional[str] = Query(None, description="Optional airline code or name filter (e.g. 6E)", examples=["6E"]),
    db: Session = Depends(get_db)
):
    if db is None:
        return HistoricalFaresResponse(
            route=f"{origin}-{destination}",
            origin=origin,
            destination=destination,
            total_observations=0,
            days_available=0,
            data_points=[]
        )

    service = HistoricalService(db)
    return service.get_historical_fares(
        origin=origin,
        destination=destination,
        days=days,
        start_date=start_date,
        end_date=end_date,
        airline=airline
    )
