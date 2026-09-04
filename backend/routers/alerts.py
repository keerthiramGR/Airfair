from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import AlertResponse
from backend.services.alert_service import get_recent_alerts

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get(
    "",
    response_model=List[AlertResponse],
    summary="Get recent price surge alerts",
    description="Returns active automated price alerts for abnormal corridor fare movements stored in Supabase PostgreSQL."
)
def read_alerts(db: Session = Depends(get_db)):
    return get_recent_alerts(db=db)
