from backend.database.connection import SessionLocal
from backend.database.models import FareQuote, Route, Airline, FareDailySummary, AirfarePriceIndex
from sqlalchemy import func, text
import statistics

db = SessionLocal()

print("==================================================")
print("     PHASE 7 STEP 1: ML READINESS AUDIT           ")
print("==================================================")

# 1. Total records breakdown
total_quotes = db.query(func.count(FareQuote.id)).scalar()
source_counts = db.query(FareQuote.source, func.count(FareQuote.id)).group_by(FareQuote.source).all()
print(f"\n1. TOTAL RECORDS IN FARE_QUOTES: {total_quotes}")
print(f"   Breakdown by Source: {dict(source_counts)}")

# Real records only (SERPAPI, AIRLINE, OTA)
real_quotes_query = db.query(FareQuote).filter(FareQuote.source != 'MOCK')
real_quotes = real_quotes_query.all()
real_count = len(real_quotes)
print(f"\n2. REAL RECORDS COUNT (excluding MOCK): {real_count}")

# 2. Routes and Airlines in Real Data
routes_in_real = (
    db.query(Route.origin, Route.destination, func.count(FareQuote.id))
    .join(FareQuote, Route.id == FareQuote.route_id)
    .filter(FareQuote.source != 'MOCK')
    .group_by(Route.origin, Route.destination)
    .all()
)
print(f"\n3. ROUTES WITH REAL DATA ({len(routes_in_real)} routes):")
for orig, dest, count in routes_in_real:
    print(f"   - {orig} -> {dest}: {count} quotes")

airlines_in_real = (
    db.query(Airline.code, Airline.name, func.count(FareQuote.id))
    .join(FareQuote, Airline.id == FareQuote.airline_id)
    .filter(FareQuote.source != 'MOCK')
    .group_by(Airline.code, Airline.name)
    .all()
)
print(f"\n4. AIRLINES IN REAL DATA ({len(airlines_in_real)} airlines):")
for code, name, count in airlines_in_real:
    print(f"   - [{code}] {name}: {count} quotes")

# 3. Unique Observation Dates and Flight Dates
obs_dates_real = (
    db.query(func.date(FareQuote.scraped_at))
    .filter(FareQuote.source != 'MOCK')
    .distinct()
    .all()
)
unique_obs_dates = sorted([str(d[0]) for d in obs_dates_real if d[0] is not None])

flight_dates_real = (
    db.query(FareQuote.flight_date)
    .filter(FareQuote.source != 'MOCK')
    .distinct()
    .all()
)
unique_flight_dates = sorted([str(d[0]) for d in flight_dates_real if d[0] is not None])

print(f"\n5. UNIQUE OBSERVATION DATES IN REAL DATA ({len(unique_obs_dates)} dates):")
print(f"   Observation dates: {unique_obs_dates}")
print(f"\n6. UNIQUE FLIGHT DATES IN REAL DATA ({len(unique_flight_dates)} dates):")
print(f"   Flight dates: {unique_flight_dates}")

# 4. Advance purchase windows
adv_windows_real = (
    db.query(FareQuote.advance_purchase_window, func.count(FareQuote.id))
    .filter(FareQuote.source != 'MOCK')
    .group_by(FareQuote.advance_purchase_window)
    .all()
)
print(f"\n7. ADVANCE PURCHASE WINDOWS IN REAL DATA:")
for win, count in adv_windows_real:
    print(f"   - {win}: {count} quotes")

# 5. Missing Values in Real Data
missing_base = sum(1 for q in real_quotes if q.base_fare is None)
missing_taxes = sum(1 for q in real_quotes if q.taxes is None or float(q.taxes) == 0.0)
missing_udf = sum(1 for q in real_quotes if q.user_development_fee is None or float(q.user_development_fee) == 0.0)
missing_conv = sum(1 for q in real_quotes if q.convenience_fee is None or float(q.convenience_fee) == 0.0)
missing_url = sum(1 for q in real_quotes if not q.source_url)
missing_status = sum(1 for q in real_quotes if not q.availability_status)

print(f"\n8. MISSING VALUE AUDIT (Real records: {real_count}):")
print(f"   - Missing Base Fare: {missing_base} (0%)")
print(f"   - Zero/Unspecified Taxes: {missing_taxes} ({round(missing_taxes/real_count*100, 1) if real_count else 0}%)")
print(f"   - Zero/Unspecified UDF: {missing_udf} ({round(missing_udf/real_count*100, 1) if real_count else 0}%)")
print(f"   - Zero/Unspecified Convenience Fee: {missing_conv} ({round(missing_conv/real_count*100, 1) if real_count else 0}%)")
print(f"   - Missing Source URL: {missing_url} ({round(missing_url/real_count*100, 1) if real_count else 0}%)")
print(f"   - Missing Availability Status: {missing_status} (0%)")

# 6. Fares Statistical Distribution & Outliers in Real Data
fares_real = [float(q.total_fare) for q in real_quotes if q.total_fare is not None]
if fares_real:
    mean_fare = statistics.mean(fares_real)
    median_fare = statistics.median(fares_real)
    stdev_fare = statistics.stdev(fares_real) if len(fares_real) > 1 else 0.0
    min_fare = min(fares_real)
    max_fare = max(fares_real)
    
    # IQR outliers
    q1 = statistics.median(sorted(fares_real)[:len(fares_real)//2]) if len(fares_real) >= 4 else min_fare
    q3 = statistics.median(sorted(fares_real)[len(fares_real)//2:]) if len(fares_real) >= 4 else max_fare
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    outliers = [f for f in fares_real if f < lower_bound or f > upper_bound]

    print(f"\n9. STATISTICAL FARE DISTRIBUTION (Real Data):")
    print(f"   - Min Fare: INR {min_fare}")
    print(f"   - Max Fare: INR {max_fare}")
    print(f"   - Mean Fare: INR {round(mean_fare, 2)}")
    print(f"   - Median Fare: INR {round(median_fare, 2)}")
    print(f"   - Std Dev: INR {round(stdev_fare, 2)}")
    print(f"   - IQR Bounds: [{round(lower_bound, 2)}, {round(upper_bound, 2)}]")
    print(f"   - Outliers Count: {len(outliers)} ({round(len(outliers)/len(fares_real)*100, 1)}%)")
    print(f"   - Outlier Values: {outliers}")

# 7. Historical Coverage per Route in Clean Daily Summaries
print("\n10. HISTORICAL COVERAGE PER ROUTE (from fare_daily_summary):")
all_routes = db.query(Route).all()
for r in all_routes:
    summaries = db.query(FareDailySummary).filter(FareDailySummary.route_id == r.id).all()
    unique_dates = len(set(s.observation_date for s in summaries))
    tot_obs = sum(s.observation_count for s in summaries)
    min_d = min((s.observation_date for s in summaries), default=None)
    max_d = max((s.observation_date for s in summaries), default=None)
    if unique_dates > 0:
        print(f"   - {r.origin} -> {r.destination}: {unique_dates} unique observation dates, {tot_obs} observations (Date span: {min_d} to {max_d})")

db.close()
