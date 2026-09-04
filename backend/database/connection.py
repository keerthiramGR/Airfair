import os
from pathlib import Path
from typing import Generator, Optional
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

# Load environment variables from backend/.env or root .env
backend_dir = Path(__file__).resolve().parent.parent
env_paths = [
    backend_dir / ".env",
    backend_dir.parent / ".env"
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLAlchemy 1.4+ requires 'postgresql://' instead of legacy 'postgres://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = None
SessionLocal = None


def init_engine():
    global engine, SessionLocal, DATABASE_URL
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    if not DATABASE_URL or "YOUR_SUPABASE_PASSWORD" in DATABASE_URL:
        return None

    # Determine pool settings
    engine_args = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "echo": False
    }

    if DATABASE_URL.startswith("sqlite"):
        engine_args["connect_args"] = {"check_same_thread": False}
    else:
        engine_args["pool_size"] = 10
        engine_args["max_overflow"] = 20

    try:
        engine = create_engine(DATABASE_URL, **engine_args)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return engine
    except Exception as e:
        print(f"[AIRFAIR Database Error] Failed to initialize engine: {e}")
        return None


# Initial attempt
init_engine()


def get_db() -> Generator[Optional[Session], None, None]:
    """
    FastAPI dependency injection yield for database sessions.
    Automatically manages transactions and closes session upon request completion.
    Gracefully yields None if database is not yet configured, allowing services
    to return calibrated fallbacks without crashing the API.
    """
    global SessionLocal
    if SessionLocal is None:
        init_engine()

    if SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as exc:
        db.rollback()
        print(f"[AIRFAIR Database Session Error] {exc}")
        yield None
    finally:
        db.close()


def check_db_health() -> bool:
    """
    Pings the database to verify active PostgreSQL connectivity.
    """
    global engine
    if engine is None:
        init_engine()
    if engine is None:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def get_engine():
    global engine
    if engine is None:
        init_engine()
    return engine


def ensure_tables():
    eng = get_engine()
    if eng:
        try:
            from backend.database.models import Base
            Base.metadata.create_all(bind=eng)
        except Exception as e:
            print(f"[AIRFAIR Database Notice] Table check: {e}")
