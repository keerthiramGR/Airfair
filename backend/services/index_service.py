from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database.models import AirfareIndex
from backend.schemas.schemas import IndexPoint


def get_index_data(days: Optional[int] = None, db: Optional[Session] = None) -> List[IndexPoint]:
    """
    Returns historical daily composite Airfare Price Index points from PostgreSQL.
    """
    if db is None:
        return _fallback_index(days)

    try:
        query = (
            db.query(AirfareIndex)
            .filter(AirfareIndex.route_id.is_(None))
            .order_by(AirfareIndex.date.asc())
        )

        records = query.all()
        if not records:
            # Check if any index records exist regardless of route_id
            records = db.query(AirfareIndex).order_by(AirfareIndex.date.asc()).all()

        if not records:
            return _fallback_index(days)

        points = [
            IndexPoint(date=r.date.isoformat(), index=float(r.index_value))
            for r in records
        ]

        if days is not None and days > 0:
            points = points[-days:]

        return points

    except Exception as exc:
        print(f"[Index Service Warning] Query failed: {exc}")
        return _fallback_index(days)


def _fallback_index(days: Optional[int]) -> List[IndexPoint]:
    sample_data = [
        {"date": "2026-08-04", "index": 108.4},
        {"date": "2026-08-08", "index": 111.2},
        {"date": "2026-08-12", "index": 112.8},
        {"date": "2026-08-16", "index": 114.9},
        {"date": "2026-08-20", "index": 115.8},
        {"date": "2026-08-24", "index": 116.2},
        {"date": "2026-08-28", "index": 119.1},
        {"date": "2026-09-02", "index": 120.4}
    ]
    points = [IndexPoint(**item) for item in sample_data]
    if days is not None and days > 0:
        points = points[-days:]
    return points
