/**
 * AIRFAIR API Client
 * Centralized REST client connecting the Next.js frontend to the FastAPI backend.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`API Error [${res.status}]: ${res.statusText} at ${endpoint}`);
  }

  return res.json();
}

export async function getHealth() {
  return fetchAPI("/health");
}

export async function getDashboard() {
  return fetchAPI("/api/dashboard");
}

export async function getRoutes() {
  return fetchAPI("/api/routes");
}

export async function getRouteDetails(origin, destination) {
  return fetchAPI(`/api/routes/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`);
}

export async function getIndex(params = {}) {
  let query = "";
  if (typeof params === "number" || typeof params === "string") {
    query = `?days=${params}`;
  } else if (params && typeof params === "object") {
    const q = new URLSearchParams(params).toString();
    query = q ? `?${q}` : "";
  }
  return fetchAPI(`/api/index${query}`);
}

export async function getIndexHistory(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/index/history${query ? `?${query}` : ""}`);
}


export async function getForecast(origin = "DEL", destination = "BOM") {
  return fetchAPI(`/api/forecast/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`);
}

export async function getLeadTime(origin = "DEL", destination = "BOM") {
  return fetchAPI(`/api/lead-time/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`);
}

export async function getAlerts() {
  return fetchAPI("/api/alerts");
}

export async function getInsights() {
  return fetchAPI("/api/insights");
}

export async function getFares(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/fares${query ? `?${query}` : ""}`);
}


/**
 * OTP Auth — uses Next.js API routes (no Python backend required for auth)
 * Routes: /api/auth/send-otp  and  /api/auth/verify-otp
 */
export async function sendOTP(email) {
  let res;
  try {
    res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
  } catch (networkErr) {
    throw new Error("Network error — please check your connection.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to send verification code.");
  }
  return res.json();
}

export async function verifyOTP(email, otp) {
  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid verification code.");
  }
  return res.json();
}

export async function getCollectionStatus() {
  return fetchAPI("/api/collection/status");
}

export async function triggerCollectionRun(payload = {}) {
  const url = `${API_BASE_URL}/api/collection/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Collection job failed.");
  }
  return res.json();
}

export async function getHistoricalFares(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/historical/fares${query ? `?${query}` : ""}`);
}

export async function getDataQualityStatus(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchAPI(`/api/data-quality/status${query ? `?${query}` : ""}`);
}

export async function triggerDataQualityRun(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/data-quality/run${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Data quality run failed.");
  }
  return res.json();
}

export async function getMLReadiness() {
  return fetchAPI("/api/collection/ml-readiness");
}



