from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.schemas.schemas import HealthResponse
from backend.database.connection import check_db_health
from backend.routers import (
    dashboard_router,
    routes_router,
    fares_router,
    index_router,
    forecasts_router,
    alerts_router,
    analytics_router,
    auth_router,
    collection_router,
    historical_router,
    data_quality_router,
    booking_router,
    admin_booking_router
)

app = FastAPI(
    title="AIRFAIR — Real-Time Airfare Price Index for India",
    description="""
### Smart India Hackathon 2026 — Problem Statement 26056
**Backend REST API Layer (Phase 3: Supabase PostgreSQL Integration)**

This API serves national composite airfare inflation indexes, corridor price tracking,
7-day predictive fare forecasts, advance purchase curve analytics, automated pricing alerts,
and normalized fare quotes powered by **Supabase PostgreSQL**.

*Architecture:*
- **Next.js Frontend**: Pure CSS + Next.js interactive institutional dashboard
- **FastAPI REST Service**: Modular routers, Pydantic data contracts, and services
- **SQLAlchemy ORM Layer**: Connection pooling and session dependency injection
- **Supabase PostgreSQL**: Scalable relational cloud database for airfare quote intelligence
    """,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular routers
app.include_router(dashboard_router)
app.include_router(routes_router)
app.include_router(fares_router)
app.include_router(index_router)
app.include_router(forecasts_router)
app.include_router(alerts_router)
app.include_router(analytics_router)
app.include_router(auth_router)
app.include_router(collection_router)
app.include_router(historical_router)
app.include_router(data_quality_router)
app.include_router(booking_router)
app.include_router(admin_booking_router)



@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check endpoint",
    description="Verify that the AIRFAIR FastAPI backend service and Supabase PostgreSQL database connection are online."
)
def health_check():
    db_connected = check_db_health()
    db_status = "connected" if db_connected else "offline_or_unconfigured"
    return HealthResponse(
        status="ok",
        service="AIRFAIR API (Phase 3 Supabase PostgreSQL)",
        database=db_status
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Security rule: never expose database connection strings, passwords, or raw stack traces.
    """
    print(f"[AIRFAIR Unhandled Exception] at {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please verify backend service logs."}
    )
