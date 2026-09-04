import os
import time
import requests
from typing import Optional, Dict, Any


class TravelportOAuthManager:
    """
    Secure OAuth 2.0 Token Manager for Travelport TripServices.
    Implements token caching, automatic token refresh before expiry,
    and strict isolation of client credentials.
    """

    PREPROD_AUTH_URL = "https://api.travelport.com/oauth/oauth20/token"
    PROD_AUTH_URL = "https://api.travelport.com/oauth/oauth20/token"

    def __init__(self):
        self.env = os.getenv("TRAVELPORT_ENV", "preprod").lower()
        self.client_id = os.getenv("TRAVELPORT_CLIENT_ID", "")
        self.client_secret = os.getenv("TRAVELPORT_CLIENT_SECRET", "")
        self.username = os.getenv("TRAVELPORT_USERNAME", "")
        self.password = os.getenv("TRAVELPORT_PASSWORD", "")
        self.pcc = os.getenv("TRAVELPORT_PCC", "79V2")
        self.access_group = os.getenv("TRAVELPORT_ACCESS_GROUP", "")

        self._cached_token: Optional[str] = None
        self._token_expiry_timestamp: float = 0.0

    def is_configured(self) -> bool:
        """Check if minimum Travelport OAuth credentials are provided in environment."""
        return bool(self.client_id and self.client_secret)

    def get_auth_url(self) -> str:
        return self.PROD_AUTH_URL if self.env == "production" else self.PREPROD_AUTH_URL

    def get_access_token(self, force_refresh: bool = False) -> Optional[str]:
        """
        Retrieve valid bearer token.
        Reuses cached token until 300s before expiration.
        """
        now = time.time()
        if not force_refresh and self._cached_token and now < (self._token_expiry_timestamp - 300):
            return self._cached_token

        if not self.is_configured():
            return None

        try:
            auth_url = self.get_auth_url()
            payload = {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
            if self.username and self.password:
                payload["grant_type"] = "password"
                payload["username"] = self.username
                payload["password"] = self.password

            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }

            response = requests.post(auth_url, data=payload, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                self._cached_token = data.get("access_token")
                expires_in = int(data.get("expires_in", 3600))
                self._token_expiry_timestamp = now + expires_in
                return self._cached_token
            else:
                # Log non-sensitive failure status
                print(f"[Travelport Auth] Token request failed with HTTP {response.status_code}")
                return None
        except Exception as e:
            print(f"[Travelport Auth] Network error during authentication: {type(e).__name__}")
            return None

    def invalidate_token(self):
        """Invalidate cache on 401 Unauthorized to trigger fresh login."""
        self._cached_token = None
        self._token_expiry_timestamp = 0.0
