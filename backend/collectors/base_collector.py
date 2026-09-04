from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import date


class BaseCollector(ABC):
    """
    Abstract Base Class for all AIRFAIR data collectors.
    Every source-specific collector implements this exact interface,
    ensuring source isolation and uniform pipeline execution.
    """

    def __init__(self, source_name: str, source_type: str, enabled: bool = True):
        self.source_name = source_name
        self.source_type = source_type
        self.enabled = enabled

    @abstractmethod
    def collect(
        self,
        origin: str,
        destination: str,
        flight_date: str,
        advance_window: str = "T+7"
    ) -> List[Dict[str, Any]]:
        """
        Executes data retrieval from the configured source.
        Returns a list of raw un-normalized fare records.
        """
        pass

    def __repr__(self):
        return f"<Collector(name='{self.source_name}', type='{self.source_type}', enabled={self.enabled})>"
