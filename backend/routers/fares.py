from typing import Optional
from fastapi import APIRouter, Depends, Query, Path as PathParam
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import (
    PaginatedFareQuotesResponse,
    FareSummaryResponse
)
from backend.services.fare_service import (
    get_paginated_fares,
    get_fare_summary
)

router = APIRouter(prefix="/api/fares", tags=["Fares"])


@router.get(
    "",
    response_model=PaginatedFareQuotesResponse,
    summary="Get paginated and filtered fare quotes",
    description="Retrieve granular, normalized airfare quotes with flexible filtering by corridor, airline, advance purchase window, and cabin class."
)
def read_fares(
    page: int = Query(1, ge=1, description="Page number (1-indexed)", examples=[1]),
    limit: int = Query(20, ge=1, le=100, description="Records per page", examples=[20]),
    origin: Optional[str] = Query(None, description="Filter by origin IATA code (e.g. DEL)", examples=["DEL"]),
    destination: Optional[str] = Query(None, description="Filter by destination IATA code (e.g. BOM)", examples=["BOM"]),
    airline: Optional[str] = Query(None, description="Filter by airline code (e.g. 6E) or carrier name", examples=["6E"]),
    advance_window: Optional[str] = Query(None, description="Filter by advance booking window (T+1, T+7, T+15, T+30, T+45)", examples=["T+7"]),
    fare_class: Optional[str] = Query(None, description="Filter by cabin class (ECONOMY, PREMIUM_ECONOMY, BUSINESS)", examples=["ECONOMY"]),
    db: Session = Depends(get_db)
):
    return get_paginated_fares(
        db=db,
        page=page,
        limit=limit,
        origin=origin,
        destination=destination,
        airline=airline,
        advance_window=advance_window,
        fare_class=fare_class
    )


@router.get(
    "/summary/{origin}/{destination}",
    response_model=FareSummaryResponse,
    summary="Get corridor fare summary and statistics",
    description="Calculates current average, minimum, maximum, 7-day average, 30-day average, and total quote sample count directly from Supabase PostgreSQL."
)
def read_fare_summary(
    origin: str = PathParam(..., description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = PathParam(..., description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    db: Session = Depends(get_db)
):
    return get_fare_summary(origin=origin, destination=destination, db=db)
