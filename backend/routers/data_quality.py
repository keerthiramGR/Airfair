from typing import Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.schemas.schemas import DataQualityStatusResponse
from backend.jobs.data_quality_job import DataQualityPipeline

router = APIRouter(prefix="/api/data-quality", tags=["Data Quality"])


@router.get(
    "/status",
    response_model=DataQualityStatusResponse,
    summary="Get data quality pipeline status and telemetry",
    description="Returns live metrics regarding total processed quotes, valid/invalid distribution, outliers, clean records, and the institutional data quality score."
)
def get_data_quality_status(
    origin: Optional[str] = Query(None, description="Optional route origin filter (e.g. DEL)"),
    destination: Optional[str] = Query(None, description="Optional route destination filter (e.g. BOM)"),
    db: Session = Depends(get_db)
):
    if db is None:
        return DataQualityStatusResponse(
            status="offline",
            records_processed=0,
            valid=0,
            invalid=0,
            duplicates=0,
            outliers=0,
            clean_records=0,
            records_requiring_review=0,
            quality_score=0.0,
            quality_category="Poor",
            missing_fields={}
        )

    pipeline = DataQualityPipeline(db)
    report = pipeline.execute_pipeline(origin=origin, destination=destination)
    return DataQualityStatusResponse(**report)


@router.post(
    "/run",
    response_model=DataQualityStatusResponse,
    summary="Execute data quality and daily aggregation pipeline",
    description="Trigger a full data cleaning, quality scoring, outlier detection, and daily aggregation run across stored fare observations."
)
def trigger_data_quality_run(
    origin: Optional[str] = Query(None, description="Optional route origin filter (e.g. DEL)"),
    destination: Optional[str] = Query(None, description="Optional route destination filter (e.g. BOM)"),
    db: Session = Depends(get_db)
):
    if db is None:
        return DataQualityStatusResponse(
            status="offline",
            records_processed=0,
            valid=0,
            invalid=0,
            duplicates=0,
            outliers=0,
            clean_records=0,
            records_requiring_review=0,
            quality_score=0.0,
            quality_category="Poor",
            missing_fields={}
        )

    pipeline = DataQualityPipeline(db)
    report = pipeline.execute_pipeline(origin=origin, destination=destination)
    return DataQualityStatusResponse(**report)
