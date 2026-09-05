from backend.routers.dashboard import router as dashboard_router
from backend.routers.routes import router as routes_router
from backend.routers.fares import router as fares_router
from backend.routers.index import router as index_router
from backend.routers.forecasts import router as forecasts_router
from backend.routers.alerts import router as alerts_router
from backend.routers.analytics import router as analytics_router
from backend.routers.auth import router as auth_router
from backend.routers.collection import router as collection_router
from backend.routers.historical import router as historical_router
from backend.routers.data_quality import router as data_quality_router
from backend.routers.booking import router as booking_router, admin_booking_router
from backend.routers.scheduler import router as scheduler_router

__all__ = [
    "dashboard_router",
    "routes_router",
    "fares_router",
    "index_router",
    "forecasts_router",
    "alerts_router",
    "analytics_router",
    "auth_router",
    "collection_router",
    "historical_router",
    "data_quality_router",
    "booking_router",
    "admin_booking_router",
    "scheduler_router"
]



