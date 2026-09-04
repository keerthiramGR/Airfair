from fastapi import APIRouter, Depends, Path as PathParam
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import RouteForecastResponse
from backend.services.forecast_service import get_route_forecast

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


@router.get(
    "/{origin}/{destination}",
    response_model=RouteForecastResponse,
    summary="Get 7-day fare forecast for a corridor",
    description="Returns forward-looking 7-day predicted median economy fares for the requested corridor from Supabase."
)
def read_forecast(
    origin: str = PathParam(..., description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = PathParam(..., description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    db: Session = Depends(get_db)
):
    return get_route_forecast(origin=origin, destination=destination, db=db)
