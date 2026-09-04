# AIRFAIR ML Dataset Metadata & Quality Audit Report

**Generated At:** `2026-09-03T17:59:57.821467+00:00`  
**Dataset File:** `D:\projects\Airfare\backend\ml\data\airfare_ml_dataset.csv`  
**Readiness Status:** `ACCUMULATING_REAL_DATA (INSUFFICIENT_TEMPORAL_DATA_FOR_SPLIT)`  

---

## 1. Dataset Extraction & Provenance
- **Raw Real Records in Supabase:** `481`
- **ML-Eligible Records:** `481`
- **Excluded Records:** `0`
- **Exclusion Reasons:** `None (100% valid)`
- **Mock / Synthetic Data:** Excluded (0 records)

---

## 2. Feature Schema (33 Features)
Features:
`quote_id, origin, destination, route, airline_code, airline_name, flight_date, observation_timestamp, observation_date, days_until_flight, advance_purchase_window, fare_class, flight_day_of_week, is_flight_weekend, observation_day_of_week, is_observation_weekend, flight_month, flight_day_of_month, base_fare, taxes, user_development_fee, convenience_fee, total_fare, previous_observed_fare, price_delta_vs_previous, price_delta_pct_vs_previous, route_index_value, route_observed_trend, route_price_band, is_outlier, source, currency, dataset_split`

---

## 3. Spatial & Carrier Coverage
- **Routes (6):** `BOM-BLR, DEL-BLR, DEL-BOM, DEL-CCU, DEL-HYD, MAA-DEL`
- **Observations per Route:** `{'DEL-BOM': 193, 'MAA-DEL': 70, 'DEL-BLR': 84, 'BOM-BLR': 68, 'DEL-CCU': 36, 'DEL-HYD': 30}`
- **Airlines (5):** `6E (IndiGo), AI (Air India), IX (Air India Express), QP (Akasa Air), SG (SpiceJet)`
- **Observations per Airline:** `{'6E': 134, 'AI': 128, 'SG': 52, 'QP': 100, 'IX': 67}`
- **Advance-Window Distribution:** `{'T+15': 103, 'T+7': 114, 'T+1': 87, 'T+30': 89, 'T+45': 88}`

---

## 4. Temporal Depth & Range
- **Collection Dates (2):** `['2026-09-02', '2026-09-03']`
- **Flight Dates (8):** `['2026-09-04', '2026-09-06', '2026-09-10', '2026-09-15', '2026-09-18', '2026-09-25', '2026-10-03', '2026-10-18']`
- **Outliers Flagged:** `59` (Preserved with `is_outlier` indicator)

---

## 5. Data Leakage Audit
- **Chronological Ordering:** `True`
- **Zero Future Lead-Time Leakage:** `True`
- **Zero Target Lookahead in Features:** `True`
- **Audit Status:** `PASSED`

---

## 6. Dataset Split Status
- **Status:** `INSUFFICIENT_TEMPORAL_DATA`
- **Detail:** `Dataset has 2 collection date(s) (minimum 3 required for chronological train/val/test split).`
- **Train Records:** `0`
- **Validation Records:** `None`
- **Test Records:** `0`
- **Unpartitioned Accumulating Records:** `481`
