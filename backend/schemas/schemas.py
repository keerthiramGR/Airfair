from typing import List, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# System & Health
# -----------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = Field(..., example="ok")
    service: str = Field(..., example="AIRFAIR API")
    database: Optional[str] = Field(None, example="connected")


# -----------------------------------------------------------------------------
# Dashboard KPI
# -----------------------------------------------------------------------------
class DashboardResponse(BaseModel):
    airfare_index: float = Field(..., example=120.4, description="National composite Airfare Price Index")
    index_change: float = Field(..., example=8.2, description="Percentage change vs base period")
    average_fare: int = Field(..., example=7840, description="Average domestic fare in INR")
    average_fare_change: float = Field(..., example=5.6, description="Percentage change in domestic fare")
    routes_monitored: int = Field(..., example=12, description="Number of domestic corridors monitored")
    active_alerts: int = Field(..., example=4, description="Total active price alerts")
    last_updated: str = Field(..., example="2026-09-02T10:30:00", description="ISO timestamp of last update")


# -----------------------------------------------------------------------------
# Routes & Details
# -----------------------------------------------------------------------------
class RouteResponse(BaseModel):
    origin: str = Field(..., example="DEL")
    destination: str = Field(..., example="BOM")
    average_fare: int = Field(..., example=8420)
    change_percent: float = Field(..., example=15.2)
    index: float = Field(..., example=118.4)
    status: str = Field(..., example="Rising")


class HistoricalPricePoint(BaseModel):
    date: str = Field(..., example="2026-08-26")
    fare: int = Field(..., example=8100)


class AdvanceBookingPoint(BaseModel):
    window: str = Field(..., example="T+1")
    fare: int = Field(..., example=11200)


class RouteDetailResponse(BaseModel):
    route: str = Field(..., example="DEL-BOM")
    current_fare: int = Field(..., example=8420)
    seven_day_average: int = Field(..., example=7650)
    thirty_day_average: int = Field(..., example=7120)
    index: float = Field(..., example=118.4)
    change_percent: float = Field(..., example=15.2)
    historical_prices: List[HistoricalPricePoint] = Field(default_factory=list)
    advance_booking: List[AdvanceBookingPoint] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Airline Corridor Comparison
# -----------------------------------------------------------------------------
class AirlineFareItem(BaseModel):
    airline: str = Field(..., example="IndiGo")
    code: str = Field(..., example="6E")
    average_fare: int = Field(..., example=8200)


class AirlineComparisonResponse(BaseModel):
    route: str = Field(..., example="DEL-BOM")
    airlines: List[AirlineFareItem] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Airfare Price Index
# -----------------------------------------------------------------------------
class IndexPoint(BaseModel):
    date: str = Field(..., example="2026-08-04")
    index: float = Field(..., example=108.4)


# -----------------------------------------------------------------------------
# Price Forecasts
# -----------------------------------------------------------------------------
class ForecastItem(BaseModel):
    date: str = Field(..., example="2026-09-03")
    predicted_fare: int = Field(..., example=8550)


class RouteForecastResponse(BaseModel):
    route: str = Field(..., example="DEL-BOM")
    forecast: List[ForecastItem] = Field(...)


# -----------------------------------------------------------------------------
# Lead Time Advance Curve
# -----------------------------------------------------------------------------
class LeadTimePoint(BaseModel):
    window: str = Field(..., example="T+1")
    average_fare: int = Field(..., example=11200)


# -----------------------------------------------------------------------------
# Alerts & AI Insights
# -----------------------------------------------------------------------------
class AlertResponse(BaseModel):
    route: str = Field(..., example="DEL-BOM")
    severity: str = Field(..., example="HIGH")
    message: str = Field(..., example="Fare increased by 23%")
    percentage_change: float = Field(..., example=23.0)
    timestamp: str = Field(..., example="2 hours ago")


class InsightResponse(BaseModel):
    type: str = Field(..., example="PRICE_SURGE")
    title: str = Field(..., example="Price Surge Detected")
    route: str = Field(..., example="DEL-BOM")
    description: str = Field(..., example="Fare increased by 15.2% in the last 24 hours.")
    severity: str = Field(..., example="HIGH")


# -----------------------------------------------------------------------------
# Phase 3 Fare Quotes & Summaries
# -----------------------------------------------------------------------------
class FareQuoteResponse(BaseModel):
    id: int = Field(..., example=1)
    airline_code: str = Field(..., example="6E")
    airline_name: str = Field(..., example="IndiGo")
    origin: str = Field(..., example="DEL")
    destination: str = Field(..., example="BOM")
    flight_date: str = Field(..., example="2026-09-09")
    scraped_at: str = Field(..., example="2026-09-02T08:30:00Z")
    advance_purchase_window: str = Field(..., example="T+7")
    fare_class: str = Field(..., example="ECONOMY")
    base_fare: float = Field(..., example=6500.0)
    taxes: float = Field(..., example=1100.0)
    user_development_fee: float = Field(..., example=100.0)
    convenience_fee: float = Field(..., example=250.0)
    total_fare: float = Field(..., example=7950.0)
    currency: str = Field(..., example="INR")
    source: str = Field(..., example="MOCK")
    availability_status: str = Field(..., example="AVAILABLE")


class PaginatedFareQuotesResponse(BaseModel):
    total: int = Field(..., example=125)
    page: int = Field(..., example=1)
    limit: int = Field(..., example=20)
    items: List[FareQuoteResponse] = Field(default_factory=list)


class FareSummaryResponse(BaseModel):
    route: str = Field(..., example="DEL-BOM")
    current_average: int = Field(..., example=8420)
    minimum: int = Field(..., example=6200)
    maximum: int = Field(..., example=12800)
    seven_day_average: int = Field(..., example=7650)
    thirty_day_average: int = Field(..., example=7120)
    quote_count: int = Field(..., example=125)


# -----------------------------------------------------------------------------
# Phase 5 Historical Data & Data Quality
# -----------------------------------------------------------------------------
class HistoricalFarePoint(BaseModel):
    date: str = Field(..., example="2026-09-02")
    flight_date: str = Field(..., example="2026-09-25")
    min_fare: float = Field(..., example=6425.0)
    avg_fare: float = Field(..., example=7120.0)
    max_fare: float = Field(..., example=8200.0)
    median_fare: float = Field(..., example=7050.0)
    observation_count: int = Field(..., example=15)
    quality_score: float = Field(..., example=96.5)
    trend: str = Field(..., example="INCREASING")


class HistoricalFaresResponse(BaseModel):
    route: str = Field(..., example="DEL-BOM")
    origin: str = Field(..., example="DEL")
    destination: str = Field(..., example="BOM")
    total_observations: int = Field(..., example=35)
    days_available: int = Field(..., example=3)
    data_points: List[HistoricalFarePoint] = Field(default_factory=list)


class DataQualityStatusResponse(BaseModel):
    status: str = Field(..., example="healthy")
    records_processed: int = Field(..., example=145)
    valid: int = Field(..., example=145)
    invalid: int = Field(..., example=0)
    duplicates: int = Field(..., example=0)
    outliers: int = Field(..., example=2)
    clean_records: int = Field(..., example=143)
    records_requiring_review: int = Field(..., example=0)
    quality_score: float = Field(..., example=98.4)
    quality_category: str = Field(..., example="Excellent")
    daily_summaries_created: Optional[int] = Field(None, example=8)
    duration_seconds: Optional[float] = Field(None, example=0.45)
    timestamp: Optional[str] = Field(None, example="2026-09-03T16:00:00Z")
    source: Optional[str] = Field(None, example="SERPAPI/SUPABASE")
    missing_fields: Optional[dict] = Field(default_factory=dict)


# -----------------------------------------------------------------------------
# Phase 6 Airfare Price Index Engine
# -----------------------------------------------------------------------------
class AirfareIndexSummaryResponse(BaseModel):
    origin: str = Field(..., example="DEL")
    destination: str = Field(..., example="BOM")
    airline_code: Optional[str] = Field(None, example="6E")
    period_days: int = Field(..., example=30)
    available_days: int = Field(..., example=9)
    coverage_percentage: float = Field(..., example=30.0)
    baseline_fare: float = Field(..., example=6500.0)
    current_fare: float = Field(..., example=7150.0)
    index_value: float = Field(..., example=110.0)
    percentage_change: float = Field(..., example=10.0)
    movement: str = Field(..., example="INCREASING")
    price_band: str = Field(..., example="MODERATELY_EXPENSIVE")
    reliability: str = Field(..., example="MEDIUM")
    observation_count: int = Field(..., example=47)
    message: Optional[str] = Field(None, example="Index computed from verified observations.")


class AirfareIndexHistoryItem(BaseModel):
    date: str = Field(..., example="2026-09-01")
    fare: float = Field(..., example=6400.0)
    index: float = Field(..., example=98.5)
    percentage_change: float = Field(..., example=-1.2)
    movement: str = Field(..., example="DECREASING")
    price_band: str = Field(..., example="NEAR_BASELINE")
    observation_count: int = Field(..., example=5)


