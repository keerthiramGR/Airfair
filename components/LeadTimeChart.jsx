"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart
} from "recharts";
import { Clock, Info } from "lucide-react";
import { mockLeadTimeData } from "@/data/mockAirfareData";
import { getLeadTime } from "@/lib/api";

const LeadTimeTooltip = ({ active, payload, label }) => {
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
          Window: {item.window} ({item.label || "Advance Window"})
        </div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#60a5fa" }}>
          ₹{item.fare.toLocaleString("en-IN")}
        </div>
        {item.surgeFactor && (
          <div style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "2px" }}>
            Price Premium: {item.surgeFactor}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function LeadTimeChart() {
  const [mounted, setMounted] = useState(false);
  const [leadTimeData, setLeadTimeData] = useState(null);

  useEffect(() => {
    setMounted(true);
    let isCancelled = false;

    async function fetchLeadTime() {
      try {
        const res = await getLeadTime("DEL", "BOM");
        if (!isCancelled && Array.isArray(res) && res.length > 0) {
          const formatted = res.map((item) => ({
            window: item.window,
            fare: item.average_fare,
            label: item.window === "T+1" ? "Last Minute (1 Day)" :
                   item.window === "T+7" ? "Short Advance (7 Days)" :
                   item.window === "T+15" ? "Recommended (15 Days)" :
                   item.window === "T+30" ? "Advance (30 Days)" : "Early Bird (45 Days)"
          }));
          setLeadTimeData(formatted);
        }
      } catch (err) {
        setLeadTimeData(null);
      }
    }

    fetchLeadTime();
    return () => { isCancelled = true; };
  }, []);

  const chartData = leadTimeData || mockLeadTimeData;

  return (
    <div className="analytics-card" id="leadtime-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Clock size={18} style={{ color: "#2563eb" }} />
            Fare vs Advance Booking Window
          </h2>
          <p className="card-subtitle">
            Average fare variation based on advance purchase window.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", color: "#64748b" }}>
          <Info size={13} />
          <span>Dynamic pricing curve</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: "100%", height: 260 }}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="leadTimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4338ca" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4338ca" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="window"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                domain={[5000, 13000]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<LeadTimeTooltip />} />
              <Area
                type="monotone"
                dataKey="fare"
                stroke="#4338ca"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#leadTimeGrad)"
                dot={{ r: 4, fill: "#4338ca", strokeWidth: 1.5, stroke: "#ffffff" }}
                activeDot={{ r: 6, fill: "#1e1b4b" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            Loading booking window analysis from FastAPI...
          </div>
        )}
      </div>

      {/* Summary Footer Row */}
      <div className="lead-time-summary-row">
        <span>
          <strong style={{ color: "#dc2626" }}>T+1 (Last-Minute):</strong> ₹11,200 (+64% vs T+45)
        </span>
        <span>
          <strong style={{ color: "#059669" }}>T+45 (Early Bird):</strong> ₹6,800
        </span>
        <span style={{ color: "#2563eb", fontWeight: 600 }}>
          Optimal Window: 15–30 Days (₹7,200–₹8,100)
        </span>
      </div>
    </div>
  );
}
