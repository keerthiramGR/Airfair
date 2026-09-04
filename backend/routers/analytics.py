from typing import List
from fastapi import APIRouter, Depends, Path as PathParam
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import LeadTimePoint, InsightResponse
from backend.services.lead_time_service import get_lead_time
from backend.services.insight_service import get_ai_insights

router = APIRouter(prefix="/api", tags=["Analytics & AI"])


@router.get(
    "/lead-time/{origin}/{destination}",
    response_model=List[LeadTimePoint],
    summary="Get lead-time advance purchase curve",
    description="Returns average fare breakdown across advance booking windows (T+1, T+7, T+15, T+30, T+45) calculated directly from the fare_quotes PostgreSQL table."
)
def read_lead_time(
    origin: str = PathParam(..., description="3-letter IATA origin airport code (e.g. DEL)", examples=["DEL"]),
    destination: str = PathParam(..., description="3-letter IATA destination airport code (e.g. BOM)", examples=["BOM"]),
    db: Session = Depends(get_db)
):
    return get_lead_time(origin=origin, destination=destination, db=db)


@router.get(
    "/insights",
    response_model=List[InsightResponse],
    summary="Get AI-powered pricing insights",
    description="Returns heuristic pattern-recognition cards for surge detection, upcoming increases, and route volatility computed from PostgreSQL metrics."
)
def read_insights(db: Session = Depends(get_db)):
    return get_ai_insights(db=db)
