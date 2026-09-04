"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area,
  AreaChart
} from "recharts";
import { TrendingUp, Info } from "lucide-react";
import { mockIndexTrendData } from "@/data/mockAirfareData";
import { getIndex } from "@/lib/api";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const indexVal = typeof item.index === "number" ? item.index.toFixed(1) : item.index;
    return (
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "#ffffff",
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "0.82rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
          border: "1px solid #334155"
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: "4px", fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#60a5fa" }}>
          Index: {indexVal}
        </div>
        {item.avgFare && (
          <div style={{ color: "#e2e8f0", fontSize: "0.78rem", marginTop: "2px" }}>
            Avg Domestic Fare: ₹{item.avgFare.toLocaleString("en-IN")}
          </div>
        )}
        <div style={{ color: item.index >= 100 ? "#4ade80" : "#f87171", fontSize: "0.72rem", marginTop: "4px" }}>
          {(item.index - 100) >= 0 ? `+${(item.index - 100).toFixed(1)}%` : `${(item.index - 100).toFixed(1)}%`} vs Base Period
        </div>
      </div>
    );
  }
  return null;
};

export default function IndexChart({ currentIndex = 120.4, indexChange = 8.2 }) {
  const [mounted, setMounted] = useState(false);
  const [timeframe, setTimeframe] = useState("30D");
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function fetchIndexTimeseries() {
      setLoading(true);
      try {
        const daysMap = { "7D": 7, "30D": 30, "90D": 90, "1Y": 90 };
        const days = daysMap[timeframe] || 30;
        const res = await getIndex(days);
        if (!isCancelled && Array.isArray(res) && res.length > 0) {
          // Format for chart: convert YYYY-MM-DD to friendly label
          const formatted = res.map((pt) => ({
            date: pt.date.slice(5), // MM-DD
            fullDate: pt.date,
            index: pt.index,
            avgFare: Math.round(pt.index * 65.1) // Derived baseline estimate
          }));
          setApiData(formatted);
        }
      } catch (err) {
        // Fallback to Phase 1 mock data if backend not reachable
        setApiData(null);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchIndexTimeseries();
    return () => { isCancelled = true; };
  }, [timeframe]);

  const chartData = apiData || mockIndexTrendData[timeframe] || mockIndexTrendData["30D"];

  return (
    <div className="analytics-card" id="index-trend-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <TrendingUp size={18} style={{ color: "#2563eb" }} />
            Airfare Price Index Trend
          </h2>
          <p className="card-subtitle">
            Monitors national composite airfare movements indexed to baseline 100.0
          </p>
        </div>

        {/* Timeframe Controls */}
        <div className="chart-controls-wrap">
          {["7D", "30D", "90D", "1Y"].map((tf) => (
            <button
              key={tf}
              type="button"
              className={`timeframe-pill-btn ${timeframe === tf ? "active" : ""}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf === "7D" ? "7 Days" : tf === "30D" ? "30 Days" : tf === "90D" ? "90 Days" : "1 Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Current Index Highlight Strip */}
      <div className="current-index-banner">
        <div className="current-index-banner-left">
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
            Current Index:
          </span>
          <span className="index-badge-pill">
            {typeof currentIndex === "number" ? currentIndex.toFixed(1) : currentIndex}
          </span>
          <span style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 700 }}>
            ↑ {indexChange}% Above Inflation Corridor
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#64748b" }}>
          <Info size={14} />
          <span>Base Period = 100.0 (Q1 2024)</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-canvas-container">
        {mounted && !loading ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                domain={[95, 125]}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={100}
                label={{
                  value: "Base = 100.0",
                  position: "insideBottomRight",
                  fill: "#94a3b8",
                  fontSize: 11
                }}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="index"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#indexGradient)"
                dot={{ r: 2.5, fill: "#2563eb", strokeWidth: 1, stroke: "#ffffff" }}
                activeDot={{ r: 6, fill: "#1e3a8a", strokeWidth: 2, stroke: "#ffffff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            Loading index timeseries from FastAPI...
          </div>
        )}
      </div>
    </div>
  );
}
