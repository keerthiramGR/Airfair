"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import { mockForecastData } from "@/data/mockAirfareData";
import { getForecast } from "@/lib/api";

const ForecastTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "#ffffff",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "0.8rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
          border: "1px solid #334155"
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginBottom: "2px" }}>
          {label} ({item.type === "current" ? "Baseline Today" : "Simulated Forecast"})
        </div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: item.type === "current" ? "#60a5fa" : "#38bdf8" }}>
          ₹{item.fare.toLocaleString("en-IN")}
        </div>
      </div>
    );
  }
  return null;
};

export default function ForecastChart() {
  const [mounted, setMounted] = useState(false);
  const [selectedRouteKey, setSelectedRouteKey] = useState("DEL-BOM");
  const [forecastState, setForecastState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function loadForecast() {
      setLoading(true);
      const [origin, dest] = selectedRouteKey.split("-");
      try {
        const res = await getForecast(origin, dest);
        if (!isCancelled && res && res.forecast) {
          // Format into display points: Today + 7 days
          const firstFare = res.forecast[0]?.predicted_fare || 8420;
          const currentPoint = {
            day: "Today",
            fare: Math.round(firstFare * 0.98),
            type: "current"
          };
          const forecastPoints = res.forecast.map((f, i) => ({
            day: i === 0 ? "Tomorrow" : `+${i + 1} Days`,
            date: f.date,
            fare: f.predicted_fare,
            type: "forecast"
          }));

          const allPoints = [currentPoint, ...forecastPoints];
          const lastFare = allPoints[allPoints.length - 1].fare;
          const deltaPct = (((lastFare - currentPoint.fare) / currentPoint.fare) * 100).toFixed(1);

          setForecastState({
            route: res.route,
            expectedIncrease: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
            confidenceBand: "±2.5%",
            points: allPoints
          });
        }
      } catch (err) {
        setForecastState(null);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadForecast();
    return () => { isCancelled = true; };
  }, [selectedRouteKey]);

  const fallbackData = mockForecastData[selectedRouteKey] || mockForecastData["DEL-BOM"];
  const routeData = forecastState || fallbackData;
  const isRising = routeData.expectedIncrease.startsWith("+");

  return (
    <div className="analytics-card" id="forecast-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Calendar size={18} style={{ color: "#2563eb" }} />
            7-Day Fare Forecast
          </h2>
          <p className="card-subtitle">
            Simulated 7-day median economy fares along major routes (Prototype — ML in Phase 3)
          </p>
        </div>

        {/* Route Selector Dropdown */}
        <select
          className="forecast-route-picker"
          value={selectedRouteKey}
          onChange={(e) => setSelectedRouteKey(e.target.value)}
          aria-label="Select route for 7-day forecast"
        >
          <option value="DEL-BOM">DEL → BOM (Delhi - Mumbai)</option>
          <option value="BOM-BLR">BOM → BLR (Mumbai - Bengaluru)</option>
          <option value="MAA-DEL">MAA → DEL (Chennai - Delhi)</option>
          <option value="BLR-HYD">BLR → HYD (Bengaluru - Hyderabad)</option>
        </select>
      </div>

      {/* Highlight Banner */}
      <div className={`forecast-highlight-banner ${isRising ? "rising-banner" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <TrendingUp size={16} />
          <span className="forecast-banner-text">
            Expected {isRising ? "increase" : "change"}: {routeData.expectedIncrease}
          </span>
        </div>
        <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>
          Confidence Band: {routeData.confidenceBand}
        </span>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: "100%", height: 260 }}>
        {mounted && !loading ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={routeData.points} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<ForecastTooltip />} />
              <ReferenceLine
                x="Today"
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{ value: "Historical", position: "insideTopLeft", fill: "#94a3b8", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="fare"
                stroke="#2563eb"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.type === "current") {
                    return (
                      <circle
                        key={payload.day}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#1e3a8a"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={payload.day}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#38bdf8"
                      stroke="#0284c7"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 7, fill: "#1e3a8a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            Loading forecast from FastAPI...
          </div>
        )}
      </div>

      {/* Discrete 7-Day Numbers Row */}
      <div className="forecast-pills-row">
        {routeData.points.map((pt) => (
          <div
            key={pt.day}
            className="forecast-pill-item"
            style={{
              backgroundColor: pt.type === "current" ? "#eff6ff" : "#f8fafc",
              borderColor: pt.type === "current" ? "#bfdbfe" : "#e2e8f0"
            }}
          >
            <div className="forecast-pill-day">
              {pt.day} {pt.type === "current" && "(Now)"}
            </div>
            <div className="forecast-pill-fare">
              ₹{pt.fare.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
