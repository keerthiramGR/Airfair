"use client";

import React from "react";
import { ArrowUpRight, TrendingUp, IndianRupee, Network, AlertTriangle } from "lucide-react";
import { mockKPIData } from "@/data/mockAirfareData";

export default function KPICards({ data, isLoading }) {
  // Gracefully adapt both FastAPI schema and mock data
  const indexVal = data?.airfare_index !== undefined ? data.airfare_index.toFixed(1) : (data?.airfareIndex?.value || mockKPIData.airfareIndex.value);
  const indexChange = data?.index_change !== undefined ? `+${data.index_change}%` : (data?.airfareIndex?.change || mockKPIData.airfareIndex.change);
  
  const avgFareVal = data?.average_fare !== undefined ? `₹${data.average_fare.toLocaleString("en-IN")}` : (data?.averageDomesticFare?.value || mockKPIData.averageDomesticFare.value);
  const avgFareChange = data?.average_fare_change !== undefined ? `+${data.average_fare_change}%` : (data?.averageDomesticFare?.change || mockKPIData.averageDomesticFare.change);
  
  const routesCount = data?.routes_monitored !== undefined ? data.routes_monitored : (data?.routesMonitored?.count || mockKPIData.routesMonitored.count);
  const alertsCount = data?.active_alerts !== undefined ? data.active_alerts : (data?.priceAlerts?.total || mockKPIData.priceAlerts.total);

  return (
    <div className="kpi-grid">
      {/* 1. Airfare Price Index */}
      <div className="kpi-card" id="kpi-index">
        <div className="kpi-top">
          <span className="kpi-label">Airfare Price Index</span>
          <div className="kpi-icon-wrap" title="Basket Price Index">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="kpi-main-metric">
          <span className="kpi-number">{isLoading ? "..." : indexVal}</span>
          <span className="kpi-delta-tag up-red">
            <ArrowUpRight size={13} />
            <span>{indexChange}</span>
          </span>
        </div>
        <div className="kpi-footer">
          <span>vs Base Period</span>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Base: 100.0</span>
        </div>
      </div>

      {/* 2. Average Domestic Fare */}
      <div className="kpi-card" id="kpi-avg-fare">
        <div className="kpi-top">
          <span className="kpi-label">Average Domestic Fare</span>
          <div className="kpi-icon-wrap" title="National Weighted Average">
            <IndianRupee size={18} />
          </div>
        </div>
        <div className="kpi-main-metric">
          <span className="kpi-number">{isLoading ? "..." : avgFareVal}</span>
          <span className="kpi-delta-tag up-red">
            <ArrowUpRight size={13} />
            <span>{avgFareChange}</span>
          </span>
        </div>
        <div className="kpi-footer">
          <span>vs Last Month</span>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>National Median</span>
        </div>
      </div>

      {/* 3. Routes Monitored */}
      <div className="kpi-card" id="kpi-routes">
        <div className="kpi-top">
          <span className="kpi-label">Routes Monitored</span>
          <div className="kpi-icon-wrap" title="Active Air Corridors">
            <Network size={18} />
          </div>
        </div>
        <div className="kpi-main-metric">
          <span className="kpi-number">{isLoading ? "..." : routesCount}</span>
          <span className="kpi-delta-tag up-blue">
            <span>High Density</span>
          </span>
        </div>
        <div className="kpi-footer">
          <span>18 Major Hubs</span>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>6 Carriers</span>
        </div>
      </div>

      {/* 4. Price Alerts */}
      <div className="kpi-card" id="kpi-alerts">
        <div className="kpi-top">
          <span className="kpi-label">Price Alerts</span>
          <div className="kpi-icon-wrap" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }} title="Surge Anomalies">
            <AlertTriangle size={18} />
          </div>
        </div>
        <div className="kpi-main-metric">
          <span className="kpi-number">{isLoading ? "..." : alertsCount}</span>
          <span className="kpi-delta-tag alert-badge">
            <span>3 High Priority</span>
          </span>
        </div>
        <div className="kpi-footer">
          <span>Real-time Trigger</span>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>FastAPI Verified</span>
        </div>
      </div>
    </div>
  );
}
