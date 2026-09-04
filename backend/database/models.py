from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    Numeric,
    Date,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    func
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Airline(Base):
    __tablename__ = "airlines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False, unique=True, index=True)
    country = Column(String(50), nullable=False, default="India")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    fare_quotes = relationship("FareQuote", back_populates="airline", cascade="all, delete-orphan")
    daily_summaries = relationship("FareDailySummary", back_populates="airline", cascade="all, delete-orphan")
    price_indexes = relationship("AirfarePriceIndex", back_populates="airline", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Airline(code='{self.code}', name='{self.name}')>"


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String(10), nullable=False, index=True)
    destination = Column(String(10), nullable=False, index=True)
    origin_city = Column(String(100), nullable=False)
    destination_city = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("origin", "destination", name="uq_routes_origin_destination"),
    )

    fare_quotes = relationship("FareQuote", back_populates="route", cascade="all, delete-orphan")
    index_records = relationship("AirfareIndex", back_populates="route")
    forecasts = relationship("PriceForecast", back_populates="route", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="route", cascade="all, delete-orphan")
    daily_summaries = relationship("FareDailySummary", back_populates="route", cascade="all, delete-orphan")
    price_indexes = relationship("AirfarePriceIndex", back_populates="route", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Route({self.origin} -> {self.destination})>"


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)  # AIRLINE, OTA, AGGREGATOR, GDS
    url = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<DataSource(name='{self.name}', type='{self.source_type}')>"


class FareQuote(Base):
    __tablename__ = "fare_quotes"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    airline_id = Column(Integer, ForeignKey("airlines.id", ondelete="CASCADE"), nullable=False, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    flight_date = Column(Date, nullable=False, index=True)
    scraped_at = Column(DateTime(timezone=True), nullable=False, index=True)
    advance_purchase_window = Column(String(10), nullable=False, index=True)  # T+1, T+7, T+15, T+30, T+45
    fare_class = Column(String(30), nullable=False, default="ECONOMY")       # ECONOMY, PREMIUM_ECONOMY, BUSINESS
    base_fare = Column(Numeric(10, 2), nullable=False)
    taxes = Column(Numeric(10, 2), nullable=False, default=0.0)
    user_development_fee = Column(Numeric(10, 2), nullable=False, default=0.0)
    convenience_fee = Column(Numeric(10, 2), nullable=False, default=0.0)
    total_fare = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    source = Column(String(30), nullable=False, default="MOCK")
    source_url = Column(Text, nullable=True)
    availability_status = Column(String(30), nullable=False, default="AVAILABLE")  # AVAILABLE, SOLD_OUT, CANCELLED, UNKNOWN
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "airline_id",
            "route_id",
            "flight_date",
            "advance_purchase_window",
            "fare_class",
            "source",
            "scraped_at",
            name="uq_fare_quotes_dedup"
        ),
        CheckConstraint(
            "total_fare = base_fare + taxes + user_development_fee + convenience_fee",
            name="chk_total_fare_consistency"
        )
    )

    airline = relationship("Airline", back_populates="fare_quotes")
    route = relationship("Route", back_populates="fare_quotes")

    def __repr__(self):
        return f"<FareQuote(route_id={self.route_id}, airline_id={self.airline_id}, total={self.total_fare})>"


class AirfareIndex(Base):
    __tablename__ = "airfare_index"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(Date, nullable=False, index=True)
    frequency = Column(String(20), nullable=False, default="DAILY")  # DAILY, WEEKLY, MONTHLY
    index_value = Column(Numeric(10, 2), nullable=False)
    base_value = Column(Numeric(10, 2), nullable=False, default=100.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    route = relationship("Route", back_populates="index_records")

    def __repr__(self):
        return f"<AirfareIndex(date='{self.date}', value={self.index_value})>"


class PriceForecast(Base):
    __tablename__ = "price_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)
    predicted_fare = Column(Numeric(10, 2), nullable=False)
    model_name = Column(String(50), nullable=False, default="MOCK")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    route = relationship("Route", back_populates="forecasts")

    def __repr__(self):
        return f"<PriceForecast(route_id={self.route_id}, date='{self.forecast_date}', fare={self.predicted_fare})>"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    percentage_change = Column(Numeric(6, 2), nullable=False)
    is_resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    route = relationship("Route", back_populates="alerts")

    def __repr__(self):
        return f"<Alert(route_id={self.route_id}, severity='{self.severity}', change={self.percentage_change}%)>"


class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), nullable=False, default="IN_PROGRESS")  # IN_PROGRESS, COMPLETED, FAILED
    source = Column(String(50), nullable=False)
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    flight_date = Column(Date, nullable=False)
    records_collected = Column(Integer, nullable=False, default=0)
    records_inserted = Column(Integer, nullable=False, default=0)
    records_rejected = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<CollectionRun(id={self.id}, source='{self.source}', status='{self.status}')>"


class FareDailySummary(Base):
    __tablename__ = "fare_daily_summary"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    airline_id = Column(Integer, ForeignKey("airlines.id", ondelete="CASCADE"), nullable=True, index=True)
    flight_date = Column(Date, nullable=False, index=True)
    observation_date = Column(Date, nullable=False, index=True)
    min_fare = Column(Numeric(10, 2), nullable=False)
    max_fare = Column(Numeric(10, 2), nullable=False)
    average_fare = Column(Numeric(10, 2), nullable=False)
    median_fare = Column(Numeric(10, 2), nullable=False)
    observation_count = Column(Integer, nullable=False, default=1)
    quality_score = Column(Numeric(5, 2), nullable=False, default=100.0)
    trend = Column(String(20), nullable=False, default="STABLE")  # INCREASING, DECREASING, STABLE
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "route_id",
            "airline_id",
            "flight_date",
            "observation_date",
            name="uq_fare_daily_summary"
        ),
    )

    route = relationship("Route", back_populates="daily_summaries")
    airline = relationship("Airline", back_populates="daily_summaries")

    def __repr__(self):
        return f"<FareDailySummary(route_id={self.route_id}, date={self.observation_date}, avg={self.average_fare})>"


class AirfarePriceIndex(Base):
    __tablename__ = "airfare_price_index"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    airline_id = Column(Integer, ForeignKey("airlines.id", ondelete="CASCADE"), nullable=True, index=True)
    observation_date = Column(Date, nullable=False, index=True)
    baseline_fare = Column(Numeric(10, 2), nullable=False)
    current_fare = Column(Numeric(10, 2), nullable=False)
    index_value = Column(Numeric(10, 2), nullable=False)
    percentage_change = Column(Numeric(6, 2), nullable=False, default=0.0)
    movement = Column(String(30), nullable=False, default="STABLE")  # INCREASING, DECREASING, STABLE, INSUFFICIENT_DATA
    price_band = Column(String(50), nullable=False, default="NEAR_BASELINE")  # LOWER_THAN_BASELINE, NEAR_BASELINE, MODERATELY_EXPENSIVE, HIGH_FARE_LEVEL, INSUFFICIENT_DATA
    observation_count = Column(Integer, nullable=False, default=1)
    data_coverage = Column(Numeric(5, 2), nullable=False, default=100.0)
    reliability = Column(String(30), nullable=False, default="MEDIUM")  # HIGH, MEDIUM, LOW, INSUFFICIENT
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "route_id",
            "airline_id",
            "observation_date",
            name="uq_airfare_price_index"
        ),
    )

    route = relationship("Route", back_populates="price_indexes")
    airline = relationship("Airline", back_populates="price_indexes")

    def __repr__(self):
        return f"<AirfarePriceIndex(route_id={self.route_id}, date={self.observation_date}, index={self.index_value})>"


