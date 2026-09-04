-- ============================================================================
-- AIRFAIR — AI-Powered Real-Time Airfare Price Index for India
-- Smart India Hackathon 2026 | Problem Statement: 26056
-- Phase 3: Supabase PostgreSQL Schema DDL
-- Safe to execute directly in Supabase SQL Editor on a fresh or existing project.
-- ============================================================================

-- 1. TABLE: airlines
-- Master list of scheduled domestic commercial airlines operating in India
CREATE TABLE IF NOT EXISTS airlines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE airlines IS 'Master catalog of airlines with IATA code and operational status';
COMMENT ON COLUMN airlines.code IS 'Unique 2-character IATA airline code (e.g. 6E, AI, SG)';

-- 2. TABLE: routes
-- Monitored domestic flight corridor pairs identified by 3-letter IATA airport codes
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_routes_origin_destination UNIQUE (origin, destination)
);

COMMENT ON TABLE routes IS 'High-density Indian domestic flight corridors with city mapping';
COMMENT ON CONSTRAINT uq_routes_origin_destination ON routes IS 'Ensures unique bidirectional corridor identification';

-- 3. TABLE: data_sources
-- Metadata for web scraping ingestion pipelines (direct airline portals & OTAs)
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('AIRLINE', 'OTA', 'AGGREGATOR', 'GDS')),
    url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE data_sources IS 'Catalog of airline portals and OTA data collection sources';

-- 4. TABLE: fare_quotes (MAIN AIRFARE TRANSACTION TABLE)
-- Granular price quotes captured across advance purchase windows, cabins, and carriers
CREATE TABLE IF NOT EXISTS fare_quotes (
    id BIGSERIAL PRIMARY KEY,
    airline_id INT NOT NULL REFERENCES airlines(id) ON DELETE CASCADE,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    flight_date DATE NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL,
    advance_purchase_window VARCHAR(10) NOT NULL CHECK (advance_purchase_window IN ('T+1', 'T+7', 'T+15', 'T+30', 'T+45')),
    fare_class VARCHAR(30) NOT NULL DEFAULT 'ECONOMY' CHECK (fare_class IN ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS')),
    base_fare NUMERIC(10, 2) NOT NULL CHECK (base_fare >= 0),
    taxes NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
    user_development_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (user_development_fee >= 0),
    convenience_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (convenience_fee >= 0),
    total_fare NUMERIC(10, 2) NOT NULL CHECK (total_fare >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    source VARCHAR(30) NOT NULL DEFAULT 'MOCK' CHECK (source IN ('AIRLINE', 'OTA', 'MOCK')),
    source_url TEXT,
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'SOLD_OUT', 'CANCELLED', 'UNKNOWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Fee integrity constraint: total_fare = base + taxes + udf + convenience
    CONSTRAINT chk_total_fare_consistency CHECK (
        total_fare = base_fare + taxes + user_development_fee + convenience_fee
    ),
    -- Deduplication strategy: prevents duplicate snapshot collection while preserving timestamped history
    CONSTRAINT uq_fare_quotes_dedup UNIQUE (
        airline_id, route_id, flight_date, advance_purchase_window, fare_class, source, scraped_at
    )
);

COMMENT ON TABLE fare_quotes IS 'Central repository of fare quotes normalized into base fare, statutory taxes, and fees';
COMMENT ON COLUMN fare_quotes.advance_purchase_window IS 'Booking window: T+1 (Last Minute), T+7 (1 Week), T+15 (2 Weeks), T+30 (1 Month), T+45 (Early Bird)';

-- 5. TABLE: airfare_index
-- National composite and corridor-level Airfare Price Index time series
CREATE TABLE IF NOT EXISTS airfare_index (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE SET NULL, -- NULL represents National Composite Index
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    index_value NUMERIC(10, 2) NOT NULL,
    base_value NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE airfare_index IS 'Historical price index tracking inflation against baseline period';

-- 6. TABLE: price_forecasts
-- Forward-looking 7-day predicted median economy fares per corridor
CREATE TABLE IF NOT EXISTS price_forecasts (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_fare NUMERIC(10, 2) NOT NULL CHECK (predicted_fare >= 0),
    model_name VARCHAR(50) NOT NULL DEFAULT 'MOCK',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE price_forecasts IS 'Short-term predictive corridor pricing model outputs';

-- 7. TABLE: alerts
-- Automated pricing surge or drop alerts flagged for route volatility
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    percentage_change NUMERIC(6, 2) NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alerts IS 'Algorithmic surge alerts and anomalies triggered by corridor variance';

-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Fast lookup for fare quotes by corridor, airline, flight date, scrape time, and advance window
CREATE INDEX IF NOT EXISTS idx_fare_quotes_route_id ON fare_quotes(route_id);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_airline_id ON fare_quotes(airline_id);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_flight_date ON fare_quotes(flight_date);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_scraped_at ON fare_quotes(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_advance_window ON fare_quotes(advance_purchase_window);

-- Fast airport corridor queries
CREATE INDEX IF NOT EXISTS idx_routes_origin ON routes(origin);
CREATE INDEX IF NOT EXISTS idx_routes_destination ON routes(destination);
CREATE INDEX IF NOT EXISTS idx_routes_corridor ON routes(origin, destination);

-- Fast time-series querying for Airfare Price Index
CREATE INDEX IF NOT EXISTS idx_airfare_index_route_id ON airfare_index(route_id);
CREATE INDEX IF NOT EXISTS idx_airfare_index_date ON airfare_index(date DESC);

-- Fast retrieval for price forecasts by corridor and date
CREATE INDEX IF NOT EXISTS idx_price_forecasts_route_id ON price_forecasts(route_id);
CREATE INDEX IF NOT EXISTS idx_price_forecasts_forecast_date ON price_forecasts(forecast_date);

-- Fast alert sorting and corridor filtering
CREATE INDEX IF NOT EXISTS idx_alerts_route_id ON alerts(route_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(is_resolved) WHERE is_resolved = FALSE;
