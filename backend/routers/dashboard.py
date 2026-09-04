from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import DashboardResponse
from backend.services.dashboard_service import get_dashboard_metrics

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get national airfare dashboard summary",
    description="Returns composite price index, average domestic fare, 24h deltas, monitored corridor count, and active alert totals from Supabase PostgreSQL."
)
def read_dashboard(db: Session = Depends(get_db)):
    return get_dashboard_metrics(db=db)
