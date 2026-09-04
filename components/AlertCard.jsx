"use client";

import React, { useState } from "react";
import { AlertTriangle, Bell, Check } from "lucide-react";
import { mockAlerts } from "@/data/mockAirfareData";

export default function AlertCard({ alerts }) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const dataList = alerts && alerts.length > 0
    ? alerts.map((a, idx) => ({
        id: `alert-${idx}`,
        severity: a.severity || "Medium",
        route: a.route?.replace("-", " → ") || "DEL → BOM",
        headline: a.message || `Fare surged by ${a.percentage_change}%`,
        details: `${a.route} recorded a ${a.percentage_change}% price movement. Automated monitoring active.`,
        timestamp: a.timestamp || "Recently"
      }))
    : mockAlerts;

  const filteredAlerts = dataList
    .filter((a) => !dismissedAlerts.includes(a.id))
    .filter((a) => filterSeverity === "ALL" || a.severity.toUpperCase() === filterSeverity);

  const handleDismiss = (id) => {
    setDismissedAlerts([...dismissedAlerts, id]);
  };

  return (
    <div className="analytics-card" id="alerts-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Bell size={18} style={{ color: "#dc2626" }} />
            Recent Price Alerts
          </h2>
          <p className="card-subtitle">
            Automated notifications for abnormal airfare surges and volatility events
          </p>
        </div>

        {/* Severity filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              type="button"
              className={`timeframe-pill-btn ${filterSeverity === sev ? "active" : ""}`}
              onClick={() => setFilterSeverity(sev)}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      <div className="alert-items-list">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className="alert-card-item">
            <div
              className={`alert-severity-indicator ${alert.severity.toLowerCase()}`}
              title={`${alert.severity} Priority Alert`}
            />

            <div className="alert-content-wrap">
              <div className="alert-title-row">
                <span className="alert-route-tag">{alert.route}</span>
                <span className="alert-time-tag">{alert.timestamp}</span>
              </div>

              <div className="alert-headline">{alert.headline}</div>
              <p className="alert-details-sub">{alert.details}</p>
            </div>

            <button
              type="button"
              className="icon-btn"
              style={{ width: "26px", height: "26px", alignSelf: "center", border: "none" }}
              title="Acknowledge alert"
              onClick={() => handleDismiss(alert.id)}
            >
              <Check size={14} color="#64748b" />
            </button>
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "0.85rem" }}>
            No active alerts matching the selected priority filter.
          </div>
        )}
      </div>

      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.76rem", color: "#64748b" }}>
        <span>Alert thresholds configured via Ministry of Civil Aviation guidelines.</span>
        <button
          type="button"
          style={{ color: "#2563eb", fontWeight: 600 }}
          onClick={() => setDismissedAlerts([])}
        >
          Reset View
        </button>
      </div>
    </div>
  );
}
