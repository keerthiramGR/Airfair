"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Info, ArrowUpRight, Flame } from "lucide-react";
import { mockIndianCities, mockHeatmapRoutes } from "@/data/mockAirfareData";

export default function RouteHeatmap() {
  // Default selected route: DEL → BOM
  const [selectedRoute, setSelectedRoute] = useState(mockHeatmapRoutes[0]);
  const [hoveredCity, setHoveredCity] = useState(null);

  // Geographic SVG coordinates for India hubs (0-600 width, 0-650 height)
  // Accurate relative locations for Indian subcontinent
  const cityCoordinates = {
    DEL: { x: 230, y: 145, name: "Delhi", code: "DEL" },
    BOM: { x: 135, y: 350, name: "Mumbai", code: "BOM" },
    PNQ: { x: 165, y: 380, name: "Pune", code: "PNQ" },
    HYD: { x: 275, y: 400, name: "Hyderabad", code: "HYD" },
    BLR: { x: 235, y: 495, name: "Bengaluru", code: "BLR" },
    MAA: { x: 310, y: 505, name: "Chennai", code: "MAA" },
    CCU: { x: 440, y: 280, name: "Kolkata", code: "CCU" },
    COK: { x: 215, y: 580, name: "Kochi", code: "COK" }
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
  };

  return (
    <div className="analytics-card" id="heatmap-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Navigation size={18} style={{ color: "#2563eb" }} />
            India Airfare Route Heatmap
          </h2>
          <p className="card-subtitle">
            Interactive corridor density and price surge intensity across key Indian metropolitan hubs
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#dc2626", display: "inline-block" }}></span>
            Surging Corridors
          </span>
          <span style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#059669", display: "inline-block" }}></span>
            Normal/Cooling
          </span>
        </div>
      </div>

      <div className="heatmap-container">
        {/* SVG India Map Layout */}
        <div className="heatmap-svg-wrap">
          <svg
            viewBox="0 0 580 640"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
            aria-label="India Air Corridors Map"
          >
            {/* Background Map Silhouette of India Subcontinent */}
            <defs>
              <linearGradient id="corridorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
              </linearGradient>
              <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="2 2" />
              </pattern>
            </defs>

            {/* Subtle geo grid background */}
            <rect x="10" y="10" width="560" height="620" fill="url(#gridPattern)" rx="8" />

            {/* Stylized geometric India contour outline */}
            <path
              d="M 230 40 
                 L 260 70 L 290 85 L 290 120 L 360 140 L 410 170 L 480 180 
                 L 520 200 L 510 240 L 460 250 L 440 280 L 420 330 L 370 380 
                 L 330 440 L 315 520 L 250 610 L 220 620 L 195 560 L 190 490 
                 L 145 420 L 115 360 L 110 290 L 150 250 L 160 210 L 190 170 
                 L 205 110 Z"
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.85"
            />

            {/* Flight Route Connecting Lines */}
            {mockHeatmapRoutes.map((rt) => {
              const start = cityCoordinates[rt.from];
              const end = cityCoordinates[rt.to];
              if (!start || !end) return null;

              const isSelected = selectedRoute && selectedRoute.id === rt.id;
              // Calculate curved quadratic bezier midpoint
              const midX = (start.x + end.x) / 2 + (start.y - end.y) * 0.15;
              const midY = (start.y + end.y) / 2 - Math.abs(start.x - end.x) * 0.12;

              return (
                <g key={rt.id} onClick={() => handleRouteSelect(rt)}>
                  {/* Outer click hit target */}
                  <path
                    d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    style={{ cursor: "pointer" }}
                  />
                  {/* Visible path */}
                  <path
                    d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                    fill="none"
                    stroke={isSelected ? "#1e3a8a" : rt.color}
                    strokeWidth={isSelected ? 4.5 : rt.intensity === "high" ? 3 : 2}
                    strokeDasharray={rt.intensity === "high" ? "none" : rt.intensity === "medium" ? "6 3" : "none"}
                    className="map-route-line"
                    opacity={isSelected ? 1 : 0.75}
                  />
                </g>
              );
            })}

            {/* City Hub Nodes */}
            {Object.entries(cityCoordinates).map(([code, city]) => {
              const isHovered = hoveredCity === code;
              const isConnected =
                selectedRoute &&
                (selectedRoute.from === code || selectedRoute.to === code);

              return (
                <g
                  key={code}
                  className="map-city-node"
                  transform={`translate(${city.x}, ${city.y})`}
                  onMouseEnter={() => setHoveredCity(code)}
                  onMouseLeave={() => setHoveredCity(null)}
                >
                  {/* Outer ping circle */}
                  <circle
                    r={isConnected ? 14 : 9}
                    fill={isConnected ? "rgba(37, 99, 235, 0.18)" : "rgba(148, 163, 184, 0.2)"}
                  />
                  {/* Core circle */}
                  <circle
                    r={isConnected ? 7 : 5}
                    fill={isConnected ? "#1e3a8a" : "#3b82f6"}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="city-outer"
                  />
                  {/* City Label Badge */}
                  <rect
                    x={code === "BOM" || code === "COK" ? -60 : 10}
                    y={-10}
                    width={52}
                    height={18}
                    rx={3}
                    fill={isConnected ? "#0f172a" : "#ffffff"}
                    stroke={isConnected ? "#0f172a" : "#cbd5e1"}
                    strokeWidth={1}
                  />
                  <text
                    x={code === "BOM" || code === "COK" ? -34 : 36}
                    y={3}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={isConnected ? "#ffffff" : "#1e293b"}
                  >
                    {city.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover/Click Route Inspector Panel */}
        {selectedRoute && (
          <div className="heatmap-inspector-card">
            <div className="inspector-route-tag">
              <span>{selectedRoute.from}</span>
              <span style={{ color: "#64748b", fontSize: "0.9rem" }}>➔</span>
              <span>{selectedRoute.to}</span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "999px",
                  backgroundColor:
                    selectedRoute.status === "Surging"
                      ? "#fef2f2"
                      : selectedRoute.status === "Stable"
                      ? "#fffbeb"
                      : "#ecfdf5",
                  color:
                    selectedRoute.status === "Surging"
                      ? "#dc2626"
                      : selectedRoute.status === "Stable"
                      ? "#d97706"
                      : "#059669",
                  border: "1px solid currentColor"
                }}
              >
                {selectedRoute.status}
              </span>
            </div>

            <div className="inspector-metrics-group">
              <div className="inspector-stat">
                <span className="inspector-stat-label">Average Fare</span>
                <span className="inspector-stat-val">{selectedRoute.avgFare}</span>
              </div>
              <div className="inspector-stat">
                <span className="inspector-stat-label">Airfare Index</span>
                <span className="inspector-stat-val">{selectedRoute.index.toFixed(1)}</span>
              </div>
              <div className="inspector-stat">
                <span className="inspector-stat-label">24h Change</span>
                <span
                  className="inspector-stat-val"
                  style={{
                    color: selectedRoute.change.startsWith("+") ? "#dc2626" : "#059669"
                  }}
                >
                  {selectedRoute.change}
                </span>
              </div>
            </div>

            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Click any route corridor line to inspect real-time metrics.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
