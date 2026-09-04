from typing import List, Dict, Any, Tuple


class FareDeduplicator:
    """
    Identifies redundant duplicate quotes within the collection batch and historical database.
    CRITICAL: Preserves price movements over time. Different fare values at different
    collection hours are maintained as distinct historical observations.
    Within a single scrape snapshot, selects the optimal/lowest fare per carrier.
    """

    @staticmethod
    def filter_batch(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
        """
        Deduplicates records matching the database unique constraint:
        (airline, origin, destination, flight_date, advance_window, fare_class, source, scraped_at).
        When multiple flights exist for the same airline within a single scrape snapshot,
        preserves the lowest available market fare for index accuracy.
        Returns (unique_records, duplicate_count).
        """
        best_by_key: Dict[Tuple, Dict[str, Any]] = {}
        total_input = len(records)

        for r in records:
            key = (
                str(r.get("airline_code", "")).upper(),
                str(r.get("route_origin", "")).upper(),
                str(r.get("route_destination", "")).upper(),
                str(r.get("flight_date", ""))[:10],
                str(r.get("advance_purchase_window", "")).upper(),
                str(r.get("fare_class", "")).upper(),
                str(r.get("source", "")).upper(),
                str(r.get("scraped_at", ""))
            )
            fare_val = float(r.get("total_fare", 0.0))

            if key not in best_by_key or fare_val < float(best_by_key[key].get("total_fare", 0.0)):
                best_by_key[key] = r

        unique_records = list(best_by_key.values())
        duplicate_count = total_input - len(unique_records)
        return unique_records, duplicate_count
