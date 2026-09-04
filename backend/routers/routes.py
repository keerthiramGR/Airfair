from typing import List
from fastapi import APIRouter, Depends, Path as PathParam
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import (
    RouteResponse,
    RouteDetailResponse,
    AirlineComparisonResponse
)
from backend.services.route_service import (
    get_all_routes,
    get_route_details,
    get_route_airlines
)

router = APIRouter(prefix="/api/routes", tags=["Routes"])


@router.get(
    "",
    response_model=List[RouteResponse],
    summary="Get all monitored domestic routes",
    description="Returns high-traffic Indian domestic routes with real-time average fares, percentage changes, index scores, and status flags from Supabase."
)
def read_routes(db: Session = Depends(get_db)):
    return get_all_routes(db=db)


@router.get(
    "/{origin}/{destination}",
    response_model=RouteDetailResponse,
    summary="Get specific route corridor details",
    description="Returns granular metrics, 7-day/30-day moving averages, historical price timeline, and advance booking curve for a specific corridor from Supabase."
)
def read_route_info(
    origin: str = PathParam(..., description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = PathParam(..., description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    db: Session = Depends(get_db)
):
    return get_route_details(origin=origin, destination=destination, db=db)


@router.get(
    "/{origin}/{destination}/airlines",
    response_model=AirlineComparisonResponse,
    summary="Get airline fare comparison for a corridor",
    description="Returns average fare breakdown across all operating carriers (IndiGo, Air India, SpiceJet, Akasa Air) on the selected route corridor."
)
def read_route_airlines(
    origin: str = PathParam(..., description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = PathParam(..., description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    db: Session = Depends(get_db)
):
    return get_route_airlines(origin=origin, destination=destination, db=db)
