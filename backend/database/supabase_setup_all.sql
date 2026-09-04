-- ============================================================================
-- AIRFAIR — AI-Powered Real-Time Airfare Price Index for India
-- Smart India Hackathon 2026 | Problem Statement: 26056
-- COMPLETE ALL-IN-ONE SUPABASE POSTGRESQL SETUP (SCHEMA + SEED DATA)
-- 
-- HOW TO USE:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/fqnjafaqupgkfehdlvsr
-- 2. Click "SQL Editor" on the left sidebar
-- 3. Click "New query"
-- 4. Copy and paste THIS ENTIRE FILE and click "RUN" (or Ctrl+Enter)
-- ============================================================================

-- ============================================================================
-- PART 1: SCHEMA DDL (TABLES, CONSTRAINTS & INDEXES)
-- ============================================================================

-- 1. TABLE: airlines
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

-- 3. TABLE: data_sources
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
    CONSTRAINT chk_total_fare_consistency CHECK (
        total_fare = base_fare + taxes + user_development_fee + convenience_fee
    ),
    CONSTRAINT uq_fare_quotes_dedup UNIQUE (
        airline_id, route_id, flight_date, advance_purchase_window, fare_class, source, scraped_at
    )
);

-- 5. TABLE: airfare_index
CREATE TABLE IF NOT EXISTS airfare_index (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    index_value NUMERIC(10, 2) NOT NULL,
    base_value NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLE: price_forecasts
CREATE TABLE IF NOT EXISTS price_forecasts (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_fare NUMERIC(10, 2) NOT NULL CHECK (predicted_fare >= 0),
    model_name VARCHAR(50) NOT NULL DEFAULT 'MOCK',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLE: alerts
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_fare_quotes_route_id ON fare_quotes(route_id);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_airline_id ON fare_quotes(airline_id);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_flight_date ON fare_quotes(flight_date);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_scraped_at ON fare_quotes(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_fare_quotes_advance_window ON fare_quotes(advance_purchase_window);
CREATE INDEX IF NOT EXISTS idx_routes_origin ON routes(origin);
CREATE INDEX IF NOT EXISTS idx_routes_destination ON routes(destination);
CREATE INDEX IF NOT EXISTS idx_routes_corridor ON routes(origin, destination);
CREATE INDEX IF NOT EXISTS idx_airfare_index_route_id ON airfare_index(route_id);
CREATE INDEX IF NOT EXISTS idx_airfare_index_date ON airfare_index(date DESC);
CREATE INDEX IF NOT EXISTS idx_price_forecasts_route_id ON price_forecasts(route_id);
CREATE INDEX IF NOT EXISTS idx_price_forecasts_forecast_date ON price_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_alerts_route_id ON alerts(route_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(is_resolved) WHERE is_resolved = FALSE;


-- ============================================================================
-- PART 2: SEED DATA INSERTION
-- ============================================================================

-- 1. SEED AIRLINES
INSERT INTO airlines (id, name, code, country, is_active)
VALUES
    (1, 'IndiGo', '6E', 'India', TRUE),
    (2, 'Air India', 'AI', 'India', TRUE),
    (3, 'Air India Express', 'IX', 'India', TRUE),
    (4, 'Akasa Air', 'QP', 'India', TRUE),
    (5, 'SpiceJet', 'SG', 'India', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, country = EXCLUDED.country, is_active = EXCLUDED.is_active;

SELECT setval('airlines_id_seq', (SELECT MAX(id) FROM airlines));

-- 2. SEED ROUTES
INSERT INTO routes (id, origin, destination, origin_city, destination_city, is_active)
VALUES
    (1, 'DEL', 'BOM', 'Delhi', 'Mumbai', TRUE),
    (2, 'DEL', 'BLR', 'Delhi', 'Bengaluru', TRUE),
    (3, 'DEL', 'CCU', 'Delhi', 'Kolkata', TRUE),
    (4, 'BOM', 'BLR', 'Mumbai', 'Bengaluru', TRUE),
    (5, 'BLR', 'HYD', 'Bengaluru', 'Hyderabad', TRUE),
    (6, 'MAA', 'DEL', 'Chennai', 'Delhi', TRUE),
    (7, 'MAA', 'BOM', 'Chennai', 'Mumbai', TRUE),
    (8, 'HYD', 'DEL', 'Hyderabad', 'Delhi', TRUE),
    (9, 'BLR', 'MAA', 'Bengaluru', 'Chennai', TRUE),
    (10, 'BOM', 'DEL', 'Mumbai', 'Delhi', TRUE),
    (11, 'DEL', 'HYD', 'Delhi', 'Hyderabad', TRUE),
    (12, 'CCU', 'DEL', 'Kolkata', 'Delhi', TRUE)
ON CONFLICT (origin, destination) DO UPDATE
SET origin_city = EXCLUDED.origin_city, destination_city = EXCLUDED.destination_city;

SELECT setval('routes_id_seq', (SELECT MAX(id) FROM routes));

-- 3. SEED DATA SOURCES
INSERT INTO data_sources (id, name, source_type, url, is_active)
VALUES
    (1, 'IndiGo Direct Web Portal', 'AIRLINE', 'https://www.goindigo.in', TRUE),
    (2, 'Air India Direct Portal', 'AIRLINE', 'https://www.airindia.com', TRUE),
    (3, 'Air India Express Portal', 'AIRLINE', 'https://www.airindiaexpress.com', TRUE),
    (4, 'Akasa Air Direct Portal', 'AIRLINE', 'https://www.akasaair.com', TRUE),
    (5, 'SpiceJet Direct Portal', 'AIRLINE', 'https://www.spicejet.com', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('data_sources_id_seq', (SELECT MAX(id) FROM data_sources));

-- 4. SEED AIRFARE PRICE INDEX
INSERT INTO airfare_index (route_id, date, frequency, index_value, base_value)
VALUES
    (NULL, '2026-08-01', 'DAILY', 108.20, 100.00),
    (NULL, '2026-08-02', 'DAILY', 108.70, 100.00),
    (NULL, '2026-08-03', 'DAILY', 107.90, 100.00),
    (NULL, '2026-08-04', 'DAILY', 108.40, 100.00),
    (NULL, '2026-08-05', 'DAILY', 109.10, 100.00),
    (NULL, '2026-08-06', 'DAILY', 109.60, 100.00),
    (NULL, '2026-08-07', 'DAILY', 110.40, 100.00),
    (NULL, '2026-08-08', 'DAILY', 111.20, 100.00),
    (NULL, '2026-08-09', 'DAILY', 110.80, 100.00),
    (NULL, '2026-08-10', 'DAILY', 111.50, 100.00),
    (NULL, '2026-08-11', 'DAILY', 112.10, 100.00),
    (NULL, '2026-08-12', 'DAILY', 112.80, 100.00),
    (NULL, '2026-08-13', 'DAILY', 113.30, 100.00),
    (NULL, '2026-08-14', 'DAILY', 114.20, 100.00),
    (NULL, '2026-08-15', 'DAILY', 115.60, 100.00),
    (NULL, '2026-08-16', 'DAILY', 114.90, 100.00),
    (NULL, '2026-08-17', 'DAILY', 113.80, 100.00),
    (NULL, '2026-08-18', 'DAILY', 114.40, 100.00),
    (NULL, '2026-08-19', 'DAILY', 115.10, 100.00),
    (NULL, '2026-08-20', 'DAILY', 115.80, 100.00),
    (NULL, '2026-08-21', 'DAILY', 116.50, 100.00),
    (NULL, '2026-08-22', 'DAILY', 117.20, 100.00),
    (NULL, '2026-08-23', 'DAILY', 116.90, 100.00),
    (NULL, '2026-08-24', 'DAILY', 116.20, 100.00),
    (NULL, '2026-08-25', 'DAILY', 117.00, 100.00),
    (NULL, '2026-08-26', 'DAILY', 117.80, 100.00),
    (NULL, '2026-08-27', 'DAILY', 118.50, 100.00),
    (NULL, '2026-08-28', 'DAILY', 119.10, 100.00),
    (NULL, '2026-08-29', 'DAILY', 119.80, 100.00),
    (NULL, '2026-08-30', 'DAILY', 120.10, 100.00),
    (NULL, '2026-08-31', 'DAILY', 119.60, 100.00),
    (NULL, '2026-09-01', 'DAILY', 120.00, 100.00),
    (NULL, '2026-09-02', 'DAILY', 120.40, 100.00)
ON CONFLICT DO NOTHING;

-- 5. SEED PRICE FORECASTS
INSERT INTO price_forecasts (route_id, forecast_date, predicted_fare, model_name)
VALUES
    -- DEL-BOM (Route 1)
    (1, '2026-09-03', 8550.00, 'MOCK'),
    (1, '2026-09-04', 8680.00, 'MOCK'),
    (1, '2026-09-05', 8820.00, 'MOCK'),
    (1, '2026-09-06', 8950.00, 'MOCK'),
    (1, '2026-09-07', 9040.00, 'MOCK'),
    (1, '2026-09-08', 9110.00, 'MOCK'),
    (1, '2026-09-09', 9180.00, 'MOCK'),
    -- BOM-BLR (Route 4)
    (4, '2026-09-03', 6250.00, 'MOCK'),
    (4, '2026-09-04', 6350.00, 'MOCK'),
    (4, '2026-09-05', 6480.00, 'MOCK'),
    (4, '2026-09-06', 6590.00, 'MOCK'),
    (4, '2026-09-07', 6650.00, 'MOCK'),
    (4, '2026-09-08', 6720.00, 'MOCK'),
    (4, '2026-09-09', 6790.00, 'MOCK'),
    -- MAA-DEL (Route 6)
    (6, '2026-09-03', 7950.00, 'MOCK'),
    (6, '2026-09-04', 8080.00, 'MOCK'),
    (6, '2026-09-05', 8200.00, 'MOCK'),
    (6, '2026-09-06', 8310.00, 'MOCK'),
    (6, '2026-09-07', 8400.00, 'MOCK'),
    (6, '2026-09-08', 8480.00, 'MOCK'),
    (6, '2026-09-09', 8550.00, 'MOCK'),
    -- BLR-HYD (Route 5)
    (5, '2026-09-03', 4650.00, 'MOCK'),
    (5, '2026-09-04', 4720.00, 'MOCK'),
    (5, '2026-09-05', 4810.00, 'MOCK'),
    (5, '2026-09-06', 4890.00, 'MOCK'),
    (5, '2026-09-07', 4950.00, 'MOCK'),
    (5, '2026-09-08', 5010.00, 'MOCK'),
    (5, '2026-09-09', 5060.00, 'MOCK')
ON CONFLICT DO NOTHING;

-- 6. SEED ALERTS
INSERT INTO alerts (route_id, severity, title, message, percentage_change, is_resolved)
VALUES
    (1, 'HIGH', 'DEL → BOM Price Surge', 'Economy fares on Delhi to Mumbai increased by 23.4% over the last 24 hours due to festival weekend demand.', 23.40, FALSE),
    (2, 'HIGH', 'DEL → BLR Surge Alert', 'Fares jumped by 18.2% across tech travel slots on Delhi to Bengaluru.', 18.20, FALSE),
    (6, 'MEDIUM', 'MAA → DEL Moderate Rise', 'Fares up 9.5% for T+7 advance purchase window on Chennai to Delhi.', 9.50, FALSE),
    (4, 'LOW', 'BOM → BLR Rate Softening', 'Fares decreased by 4.2% on Mumbai to Bengaluru for mid-week departures.', -4.20, FALSE),
    (3, 'MEDIUM', 'DEL → CCU Demand Spike', 'Durga Puja advance booking surge detected on Delhi to Kolkata (+12.8%).', 12.80, FALSE)
ON CONFLICT DO NOTHING;

-- 7. SEED FARE QUOTES (131 verified records)
INSERT INTO fare_quotes (
    airline_id, route_id, flight_date, scraped_at,
    advance_purchase_window, fare_class,
    base_fare, taxes, user_development_fee, convenience_fee, total_fare,
    currency, source, availability_status
)
VALUES
    -- DEL -> BOM (Route 1)
    (1, 1, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 9150.00, 1600.00, 150.00, 300.00, 11200.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 9400.00, 1650.00, 150.00, 300.00, 11500.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 1, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 8850.00, 1550.00, 150.00, 300.00, 10850.00, 'INR', 'MOCK', 'AVAILABLE'),
    (5, 1, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 8700.00, 1500.00, 150.00, 300.00, 10650.00, 'INR', 'MOCK', 'SOLD_OUT'),
    (2, 1, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 18500.00, 3300.00, 200.00, 500.00, 22500.00, 'INR', 'MOCK', 'AVAILABLE'),

    (1, 1, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6500.00, 1100.00, 100.00, 250.00, 7950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6900.00, 1200.00, 100.00, 250.00, 8450.00, 'INR', 'MOCK', 'AVAILABLE'),
    (3, 1, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6200.00, 1050.00, 100.00, 250.00, 7600.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 1, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6350.00, 1100.00, 100.00, 250.00, 7800.00, 'INR', 'MOCK', 'AVAILABLE'),
    (5, 1, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6150.00, 1050.00, 100.00, 250.00, 7550.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 9200.00, 1600.00, 150.00, 300.00, 11250.00, 'INR', 'MOCK', 'AVAILABLE'),

    (1, 1, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 5450.00, 950.00, 100.00, 250.00, 6750.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 5850.00, 1000.00, 100.00, 250.00, 7200.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 1, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 5300.00, 900.00, 100.00, 250.00, 6550.00, 'INR', 'MOCK', 'AVAILABLE'),
    (5, 1, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 5250.00, 900.00, 100.00, 250.00, 6500.00, 'INR', 'MOCK', 'AVAILABLE'),

    (1, 1, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 4750.00, 800.00, 100.00, 250.00, 5900.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 5100.00, 850.00, 100.00, 250.00, 6300.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 1, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 4650.00, 800.00, 100.00, 250.00, 5800.00, 'INR', 'MOCK', 'AVAILABLE'),
    (5, 1, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 4550.00, 750.00, 100.00, 250.00, 5650.00, 'INR', 'MOCK', 'AVAILABLE'),

    (1, 1, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 4150.00, 700.00, 100.00, 250.00, 5200.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 4450.00, 750.00, 100.00, 250.00, 5550.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 1, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 4000.00, 680.00, 100.00, 250.00, 5030.00, 'INR', 'MOCK', 'AVAILABLE'),
    (5, 1, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3950.00, 650.00, 100.00, 250.00, 4950.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- Historical DEL-BOM
    (1, 1, '2026-08-04', '2026-08-03 09:00:00+00', 'T+1', 'ECONOMY', 7900.00, 1400.00, 150.00, 300.00, 9750.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-10', '2026-08-03 09:00:00+00', 'T+7', 'ECONOMY', 5900.00, 1050.00, 100.00, 250.00, 7300.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-08-10', '2026-08-03 09:00:00+00', 'T+7', 'ECONOMY', 6200.00, 1100.00, 100.00, 250.00, 7650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-18', '2026-08-03 09:00:00+00', 'T+15', 'ECONOMY', 5000.00, 900.00, 100.00, 250.00, 6250.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-15', '2026-08-14 09:00:00+00', 'T+1', 'ECONOMY', 9800.00, 1750.00, 150.00, 300.00, 12000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 1, '2026-08-15', '2026-08-14 09:00:00+00', 'T+1', 'ECONOMY', 10100.00, 1800.00, 150.00, 300.00, 12350.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-21', '2026-08-14 09:00:00+00', 'T+7', 'ECONOMY', 6600.00, 1150.00, 100.00, 250.00, 8100.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-27', '2026-08-26 09:00:00+00', 'T+1', 'ECONOMY', 8400.00, 1500.00, 150.00, 300.00, 10350.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-28', '2026-08-27 09:00:00+00', 'T+1', 'ECONOMY', 8500.00, 1520.00, 150.00, 300.00, 10470.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-29', '2026-08-28 09:00:00+00', 'T+1', 'ECONOMY', 8600.00, 1530.00, 150.00, 300.00, 10580.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-30', '2026-08-29 09:00:00+00', 'T+1', 'ECONOMY', 8700.00, 1550.00, 150.00, 300.00, 10700.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-08-31', '2026-08-30 09:00:00+00', 'T+1', 'ECONOMY', 8800.00, 1560.00, 150.00, 300.00, 10810.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-09-01', '2026-08-31 09:00:00+00', 'T+1', 'ECONOMY', 8900.00, 1580.00, 150.00, 300.00, 10930.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 1, '2026-09-02', '2026-09-01 09:00:00+00', 'T+1', 'ECONOMY', 9000.00, 1600.00, 150.00, 300.00, 11050.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- DEL -> BLR (Route 2)
    (1, 2, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 7850.00, 1400.00, 150.00, 300.00, 9700.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 2, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 8100.00, 1450.00, 150.00, 300.00, 10000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 2, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 7600.00, 1350.00, 150.00, 300.00, 9400.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 2, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5800.00, 1000.00, 100.00, 250.00, 7150.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 2, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6100.00, 1050.00, 100.00, 250.00, 7500.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 2, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5650.00, 980.00, 100.00, 250.00, 6980.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 2, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 4850.00, 850.00, 100.00, 250.00, 6050.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 2, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 4300.00, 750.00, 100.00, 250.00, 5400.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 2, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3800.00, 650.00, 100.00, 250.00, 4800.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- DEL -> CCU (Route 3)
    (1, 3, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 6800.00, 1200.00, 150.00, 300.00, 8450.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 3, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 7050.00, 1250.00, 150.00, 300.00, 8750.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 3, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 4950.00, 900.00, 100.00, 250.00, 6200.00, 'INR', 'MOCK', 'AVAILABLE'),
    (5, 3, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 4800.00, 850.00, 100.00, 250.00, 6000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 3, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 4150.00, 750.00, 100.00, 250.00, 5250.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 3, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 3700.00, 650.00, 100.00, 250.00, 4700.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 3, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3300.00, 600.00, 100.00, 250.00, 4250.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- BOM -> BLR (Route 4)
    (1, 4, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 5300.00, 950.00, 150.00, 300.00, 6700.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 4, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 5550.00, 1000.00, 150.00, 300.00, 7000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 4, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 5150.00, 900.00, 150.00, 300.00, 6500.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 4, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 3950.00, 700.00, 100.00, 250.00, 5000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 4, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 3800.00, 680.00, 100.00, 250.00, 4830.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 4, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 3350.00, 600.00, 100.00, 250.00, 4300.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 4, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 2950.00, 550.00, 100.00, 250.00, 3850.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 4, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 2700.00, 500.00, 100.00, 250.00, 3550.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- BLR -> HYD (Route 5)
    (1, 5, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 4150.00, 750.00, 100.00, 250.00, 5250.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 5, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 4350.00, 800.00, 100.00, 250.00, 5500.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 5, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 3050.00, 550.00, 100.00, 250.00, 3950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 5, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 2950.00, 530.00, 100.00, 250.00, 3830.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 5, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 2550.00, 480.00, 100.00, 250.00, 3380.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 5, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 2250.00, 420.00, 100.00, 250.00, 3020.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 5, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 2050.00, 380.00, 100.00, 250.00, 2780.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- MAA -> DEL (Route 6)
    (1, 6, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 7200.00, 1300.00, 150.00, 300.00, 8950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 6, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 7500.00, 1350.00, 150.00, 300.00, 9300.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 6, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5300.00, 950.00, 100.00, 250.00, 6600.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 6, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5600.00, 1000.00, 100.00, 250.00, 6950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 6, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5150.00, 920.00, 100.00, 250.00, 6420.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 6, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 4450.00, 800.00, 100.00, 250.00, 5600.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 6, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 3900.00, 700.00, 100.00, 250.00, 4950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 6, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3500.00, 620.00, 100.00, 250.00, 4470.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- MAA -> BOM (Route 7)
    (1, 7, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 5250.00, 950.00, 100.00, 250.00, 6550.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 7, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 5450.00, 980.00, 100.00, 250.00, 6780.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 7, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 3850.00, 700.00, 100.00, 250.00, 4900.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 7, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 3200.00, 580.00, 100.00, 250.00, 4130.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 7, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 2800.00, 500.00, 100.00, 250.00, 3650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 7, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 2550.00, 450.00, 100.00, 250.00, 3350.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- HYD -> DEL (Route 8)
    (1, 8, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 6450.00, 1150.00, 150.00, 300.00, 8050.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 8, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 6750.00, 1200.00, 150.00, 300.00, 8400.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 8, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 4750.00, 850.00, 100.00, 250.00, 5950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 8, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 4600.00, 820.00, 100.00, 250.00, 5770.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 8, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 3950.00, 700.00, 100.00, 250.00, 5000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 8, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 3450.00, 620.00, 100.00, 250.00, 4420.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 8, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3100.00, 550.00, 100.00, 250.00, 4000.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- BLR -> MAA (Route 9)
    (1, 9, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 3650.00, 650.00, 100.00, 250.00, 4650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 9, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 2650.00, 480.00, 100.00, 250.00, 3480.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 9, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 2550.00, 460.00, 100.00, 250.00, 3360.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 9, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 2250.00, 400.00, 100.00, 250.00, 3000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 9, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 1950.00, 350.00, 100.00, 250.00, 2650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 9, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 1800.00, 320.00, 100.00, 250.00, 2470.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- BOM -> DEL (Route 10)
    (1, 10, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 9000.00, 1600.00, 150.00, 300.00, 11050.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 10, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 9350.00, 1650.00, 150.00, 300.00, 11450.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 10, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 8750.00, 1550.00, 150.00, 300.00, 10750.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 10, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6400.00, 1100.00, 100.00, 250.00, 7850.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 10, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6800.00, 1180.00, 100.00, 250.00, 8330.00, 'INR', 'MOCK', 'AVAILABLE'),
    (4, 10, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 6250.00, 1080.00, 100.00, 250.00, 7680.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 10, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 5350.00, 950.00, 100.00, 250.00, 6650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 10, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 4700.00, 800.00, 100.00, 250.00, 5850.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 10, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 4100.00, 700.00, 100.00, 250.00, 5150.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- DEL -> HYD (Route 11)
    (1, 11, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 6400.00, 1150.00, 150.00, 300.00, 8000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 11, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 4700.00, 850.00, 100.00, 250.00, 5900.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 11, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5000.00, 900.00, 100.00, 250.00, 6250.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 11, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 3900.00, 700.00, 100.00, 250.00, 4950.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 11, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 3400.00, 600.00, 100.00, 250.00, 4350.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 11, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3050.00, 550.00, 100.00, 250.00, 3950.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- CCU -> DEL (Route 12)
    (1, 12, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'ECONOMY', 6750.00, 1200.00, 150.00, 300.00, 8400.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 12, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 4900.00, 900.00, 100.00, 250.00, 6150.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 12, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'ECONOMY', 5200.00, 950.00, 100.00, 250.00, 6500.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 12, '2026-09-17', '2026-09-02 08:30:00+00', 'T+15', 'ECONOMY', 4100.00, 750.00, 100.00, 250.00, 5200.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 12, '2026-10-02', '2026-09-02 08:30:00+00', 'T+30', 'ECONOMY', 3650.00, 650.00, 100.00, 250.00, 4650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 12, '2026-10-17', '2026-09-02 08:30:00+00', 'T+45', 'ECONOMY', 3250.00, 600.00, 100.00, 250.00, 4200.00, 'INR', 'MOCK', 'AVAILABLE'),

    -- Additional Premium Economy & Business Quotes
    (2, 2, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 8600.00, 1500.00, 150.00, 300.00, 10550.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 2, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 17200.00, 3100.00, 200.00, 500.00, 21000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 4, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 6200.00, 1100.00, 100.00, 250.00, 7650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 4, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 14500.00, 2600.00, 150.00, 400.00, 17650.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 6, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 8100.00, 1450.00, 150.00, 300.00, 10000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 6, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 16800.00, 3000.00, 200.00, 500.00, 20500.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 10, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 9100.00, 1600.00, 150.00, 300.00, 11150.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 10, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 18400.00, 3300.00, 200.00, 500.00, 22400.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 5, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 4800.00, 850.00, 100.00, 250.00, 6000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 8, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 7100.00, 1250.00, 150.00, 300.00, 8800.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 8, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 15500.00, 2800.00, 200.00, 500.00, 19000.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 3, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 7400.00, 1300.00, 150.00, 300.00, 9150.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 3, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 15900.00, 2850.00, 200.00, 500.00, 19450.00, 'INR', 'MOCK', 'AVAILABLE'),
    (1, 7, '2026-09-09', '2026-09-02 08:30:00+00', 'T+7', 'PREMIUM_ECONOMY', 5900.00, 1050.00, 100.00, 250.00, 7300.00, 'INR', 'MOCK', 'AVAILABLE'),
    (2, 11, '2026-09-03', '2026-09-02 08:30:00+00', 'T+1', 'BUSINESS', 15200.00, 2750.00, 200.00, 450.00, 18600.00, 'INR', 'MOCK', 'AVAILABLE')
ON CONFLICT (airline_id, route_id, flight_date, advance_purchase_window, fare_class, source, scraped_at)
DO NOTHING;
