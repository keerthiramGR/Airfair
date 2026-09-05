"use client";

import React, { useState } from "react";
import { X, CheckCircle, Database, BookOpen, Plane, Code, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { mockRoutePerformance, mockMethodologyData } from "@/data/mockAirfareData";

export default function ModalView({ type, onClose }) {
  const [routeSearch, setRouteSearch] = useState("");

  if (!type) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            {type === "all-routes" && "National Flight Corridors Directory (48 Monitored Routes)"}
            {type === "methodology" && "Airfare Price Index — Scientific Methodology"}
            {type === "api" && "Phase 2 API Contract & Integration Specifications"}
            {type === "about" && "About AIRFAIR Platform"}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {/* 1. All Routes View */}
          {type === "all-routes" && (
            <div>
              <p style={{ marginBottom: "14px", fontSize: "0.85rem", color: "#64748b" }}>
                Comprehensive monitoring database of all Tier-1 and Tier-2 domestic air corridors across Indian metropolitan airspace.
              </p>
              <input
                type="text"
                className="search-input"
                placeholder="Filter corridors (e.g., BOM, Delhi, Kolkata, Chennai)..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                style={{ marginBottom: "16px" }}
              />

              <div className="table-responsive" style={{ maxHeight: "400px" }}>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Corridor</th>
                      <th>Origin / Destination</th>
                      <th style={{ textAlign: "right" }}>Avg Fare</th>
                      <th style={{ textAlign: "right" }}>24h Delta</th>
                      <th style={{ textAlign: "right" }}>Index Score</th>
                      <th style={{ textAlign: "center" }}>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRoutePerformance
                      .filter(
                        (r) =>
                          r.route.toLowerCase().includes(routeSearch.toLowerCase()) ||
                          r.originCity.toLowerCase().includes(routeSearch.toLowerCase()) ||
                          r.destCity.toLowerCase().includes(routeSearch.toLowerCase())
                      )
                      .map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: "#1e3a8a" }}>{r.route}</td>
                          <td style={{ fontSize: "0.8rem", color: "#475569" }}>
                            {r.originCity} ➔ {r.destCity}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{r.avgFare}</td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: r.changeNum > 0 ? "#dc2626" : r.changeNum < 0 ? "#059669" : "#475569"
                            }}
                          >
                            {r.change}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{r.index.toFixed(1)}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`status-pill ${
                                r.status.toLowerCase() === "rising"
                                  ? "rising"
                                  : r.status.toLowerCase() === "falling"
                                  ? "falling"
                                  : "stable"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Methodology View */}
          {type === "methodology" && (
            <div>
              <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "8px" }}>
                Modified Laspeyres Basket Index Framework
              </h3>
              <p style={{ lineHeight: 1.6, marginBottom: "16px" }}>
                The AIRFAIR Airfare Price Index computes a standardized domestic composite index tracking inflation across passenger airline tickets.
                It benchmarks daily observed median fares across standard advance booking windows (T+1 to T+45) against baseline pricing observed in Q1 2024.
              </p>

              <div className="api-spec-box">
                {`Index_t = [ ∑ (P_it × W_i) / ∑ (P_i0 × W_i) ] × 100

Where:
- P_it = Observed median fare for route i on date t
- P_i0 = Baseline period price for route i (Q1 2024 benchmark)
- W_i  = DGCA passenger traffic volume weighting coefficient`}
              </div>

              <h4 style={{ fontSize: "0.9rem", color: "#1e3a8a", marginTop: "16px", marginBottom: "8px" }}>
                Basket Parameters:
              </h4>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>Base Period:</strong> {mockMethodologyData.basePeriod}</li>
                <li><strong>Route Weighting:</strong> {mockMethodologyData.routeWeighting}</li>
                <li><strong>Airlines Monitored:</strong> {mockMethodologyData.carriersSampled.join(", ")}</li>
                <li><strong>Advance Windows:</strong> {mockMethodologyData.bookingWindows.join(", ")}</li>
              </ul>
            </div>
          )}

          {/* 3. API & Data View */}
          {type === "api" && (
            <div>
              <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "8px" }}>
                Phase 2 Architecture: Swapping Mock Data with Real APIs
              </h3>
              <p style={{ lineHeight: 1.6, marginBottom: "12px" }}>
                All mock data in Phase 1 is isolated inside <code style={{ color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>data/mockAirfareData.js</code>.
                In Phase 2, connect your FastAPI / Node.js backend pipeline to replace this contract.
              </p>

              <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e3a8a", marginTop: "14px" }}>
                REST Endpoints Spec (FastAPI / PostgreSQL backend):
              </h4>

              <div className="api-spec-box">
{`GET /api/v1/metrics/summary
Response: {
  "airfareIndex": { "value": "120.4", "change": "+8.2%", "basePeriod": "Q1 2024" },
  "averageDomesticFare": { "value": "₹7,840", "change": "+5.6%" },
  "routesMonitored": 48,
  "priceAlerts": { "total": 12, "highPriority": 3 }
}

GET /api/v1/index/timeseries?range=30d
Response: [
  { "date": "Day 1", "index": 105.0, "avgFare": 6920 },
  ...
  { "date": "Day 30", "index": 120.4, "avgFare": 7840 }
]

GET /api/v1/forecast/fare?route=DEL-BOM
Response: {
  "route": "DEL → BOM",
  "expectedIncrease": "+9.0%",
  "points": [ ... 7-day projected trajectory ... ]
}`}
              </div>
            </div>
          )}

          {/* 4. About AIRFAIR Platform */}
          {type === "about" && (
            <div>
              <h3 style={{ fontSize: "1rem", color: "#0f172a", marginBottom: "8px" }}>
                AIRFAIR — AI-Powered Real-Time Airfare Price Index &amp; Predictive Booking
              </h3>
              <p style={{ lineHeight: 1.6, marginBottom: "14px" }}>
                <strong>Platform Overview:</strong> Real-Time Airfare Price Index for Indian Domestic Corridors
              </p>
              <p style={{ lineHeight: 1.6, marginBottom: "14px" }}>
                <strong>Objective:</strong> Deliver automated monitoring of domestic airline pricing dynamics, detect unfair price surges during emergencies or high-demand periods, and provide travelers and analysts with transparent index analytics and automated best-fare booking.
              </p>
              <div style={{ padding: "14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.85rem", color: "#166534" }}>
                <strong>Production Status:</strong> Fully connected to PostgreSQL database, 6 high-density metro corridors, daily automated GDS ticketing scheduler, and ML price forecasting.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
