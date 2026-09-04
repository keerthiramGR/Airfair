"use client";

import React, { useState } from "react";
import { Search, ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from "lucide-react";
import { mockRoutePerformance } from "@/data/mockAirfareData";

const CITY_NAMES = {
  DEL: "Delhi",
  BOM: "Mumbai",
  BLR: "Bengaluru",
  MAA: "Chennai",
  HYD: "Hyderabad",
  CCU: "Kolkata",
  PNQ: "Pune",
  COK: "Kochi"
};

export default function RouteTable({ routes, isLoading, onViewAllRoutes }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Normalize route data between FastAPI schema and Phase 1 mock schema
  const dataList = routes && routes.length > 0
    ? routes.map((r) => {
        const origin = r.origin || r.route?.split("→")[0]?.trim() || "DEL";
        const dest = r.destination || r.route?.split("→")[1]?.trim() || "BOM";
        const routeLabel = `${origin} → ${dest}`;
        const avgFare = r.average_fare !== undefined ? `₹${r.average_fare.toLocaleString("en-IN")}` : r.avgFare;
        const changeNum = r.change_percent !== undefined ? r.change_percent : (r.changeNum || 0);
        const changeStr = changeNum > 0 ? `+${changeNum}%` : `${changeNum}%`;
        const indexVal = r.index !== undefined ? r.index : 100.0;
        const statusVal = r.status || "Stable";
        const originCity = CITY_NAMES[origin] || origin;
        const destCity = CITY_NAMES[dest] || dest;

        return {
          id: `${origin}-${dest}`,
          route: routeLabel,
          originCity,
          destCity,
          avgFare,
          change: changeStr,
          changeNum,
          index: indexVal,
          status: statusVal
        };
      })
    : mockRoutePerformance;

  const filteredRoutes = dataList.filter((item) => {
    const matchesSearch =
      item.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.destCity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      statusFilter === "ALL" || item.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "rising":
        return (
          <span className="status-pill rising">
            <ArrowUpRight size={12} />
            Rising
          </span>
        );
      case "falling":
        return (
          <span className="status-pill falling">
            <ArrowDownRight size={12} />
            Falling
          </span>
        );
      case "stable":
      default:
        return (
          <span className="status-pill stable">
            <Minus size={12} />
            Stable
          </span>
        );
    }
  };

  return (
    <div className="analytics-card" id="routes-table-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">Top Routes by Price Change</h2>
          <p className="card-subtitle">
            Monitors high-traffic domestic corridors with highest 24-hour variance
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onViewAllRoutes}
        >
          <span>View All Routes</span>
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Toolbar: Search and Filter Tabs */}
      <div className="table-toolbar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            className="search-input"
            placeholder="Search route or city (e.g., DEL, Mumbai)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="table-filter-tabs">
          {["ALL", "RISING", "STABLE", "FALLING"].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`filter-tab-btn ${statusFilter === filter ? "active" : ""}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === "ALL" ? "All Corridors" : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table */}
      <div className="table-responsive">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Route</th>
              <th style={{ textAlign: "right" }}>Avg Fare</th>
              <th style={{ textAlign: "right" }}>Change</th>
              <th style={{ textAlign: "right" }}>Index</th>
              <th style={{ textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="route-cell-main">{row.route}</div>
                  <div className="route-cell-sub">
                    {row.originCity} ➔ {row.destCity}
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="fare-cell">{row.avgFare}</span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        row.changeNum > 0
                          ? "#dc2626"
                          : row.changeNum < 0
                          ? "#059669"
                          : "#475569"
                    }}
                  >
                    {row.change}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="index-cell">{typeof row.index === 'number' ? row.index.toFixed(1) : row.index}</span>
                </td>
                <td style={{ textAlign: "center" }}>
                  {getStatusBadge(row.status)}
                </td>
              </tr>
            ))}
            {filteredRoutes.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>
                  {isLoading ? "Loading route data from FastAPI..." : `No corridors found matching "${searchQuery}"`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
