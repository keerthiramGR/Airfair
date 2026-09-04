from typing import List, Dict, Any, Tuple


class MissingValueHandler:
    """
    Identifies and audits missing fields across airfare observations.
    Enforces a strict zero-fabrication policy:
    - Never backfills unknown taxes with 0 or synthetic averages.
    - Preserves NULL for missing breakdown components.
    - Generates detailed missing field audit reports.
    """

    AUDITED_FIELDS = [
        "base_fare",
        "taxes",
        "user_development_fee",
        "convenience_fee",
        "fare_class",
        "source_url",
        "availability_status"
    ]

    @classmethod
    def audit_record(cls, record: Dict[str, Any]) -> Dict[str, bool]:
        """
        Audits a single record for missing values.
        Returns a map of field_name -> is_missing (True/False).
        """
        result = {}
        for field in cls.AUDITED_FIELDS:
            val = record.get(field)
            result[field] = (val is None or str(val).strip() == "")
        return result

    @classmethod
    def audit_batch(cls, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Audits a batch of records, returning counts and percentages of missing values per field.
        """
        total = len(records)
        if total == 0:
            return {
                "total_records": 0,
                "missing_counts": {f: 0 for f in cls.AUDITED_FIELDS},
                "missing_percentages": {f: 0.0 for f in cls.AUDITED_FIELDS}
            }

        counts = {f: 0 for f in cls.AUDITED_FIELDS}
        for rec in records:
            for field in cls.AUDITED_FIELDS:
                val = rec.get(field)
                if val is None or str(val).strip() == "":
                    counts[field] += 1

        percentages = {
            f: round((counts[f] / total) * 100, 2)
            for f in cls.AUDITED_FIELDS
        }

        return {
            "total_records": total,
            "missing_counts": counts,
            "missing_percentages": percentages
        }
