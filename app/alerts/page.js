"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Bell, Filter, CheckCircle2, ShieldAlert } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getAlerts } from "@/lib/api";

const ALL_ALERTS = [
  {
    id: 1,
    severity: "HIGH",
    route: "DEL → BOM",
    description: "Average fare increased by +36.2% within 24 hours. Above DGCA baseline threshold.",
    percentage: "+36.2%",
    timestamp: "10 mins ago"
  },
  {
    id: 2,
    severity: "HIGH",
    route: "DEL → GOI",
    description: "Friday evening weekend departures experiencing sharp escalation (+28.5%).",
    percentage: "+28.5%",
    timestamp: "45 mins ago"
  },
  {
    id: 3,
    severity: "MEDIUM",
    route: "BOM → BLR",
    description: "Unusual quote volatility detected across 3 carriers for T+7 advance window.",
    percentage: "+14.8%",
    timestamp: "2 hours ago"
  },
  {
    id: 4,
    severity: "MEDIUM",
    route: "MAA → DEL",
    description: "Elevated pricing cluster on Air India and IndiGo evening flights.",
    percentage: "+11.4%",
    timestamp: "4 hours ago"
  },
  {
    id: 5,
    severity: "LOW",
    route: "BLR → HYD",
    description: "Corridor pricing normalized within historical corridor volatility envelope.",
    percentage: "-3.2%",
    timestamp: "6 hours ago"
  },
  {
    id: 6,
    severity: "LOW",
    route: "CCU → DEL",
    description: "Capacity expansion observed; fares steady at competitive baseline rates.",
    percentage: "+1.2%",
    timestamp: "8 hours ago"
  }
];

export default function AlertsPage() {
  const [filter, setFilter] = useState("ALL"); // ALL | HIGH | MEDIUM | LOW
  const [alerts, setAlerts] = useState(ALL_ALERTS);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await getAlerts();
        if (res?.alerts && res.alerts.length > 0) {
          const mapped = res.alerts.map((a, i) => ({
            id: a.id || i + 1,
            severity: (a.severity || "HIGH").toUpperCase().includes("HIGH")
              ? "HIGH"
              : (a.severity || "").toUpperCase().includes("MED")
              ? "MEDIUM"
              : "LOW",
            route: a.route_code || a.route || "DEL → BOM",
            description: a.message || a.description || "Unusual pricing event detected.",
            percentage: a.surge_pct ? `+${a.surge_pct}%` : "+22.5%",
            timestamp: "Live Telemetry"
          }));
          setAlerts(mapped);
        }
      } catch (err) {
        console.warn("Alerts fetch notice:", err.message);
      }
    }
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter((item) => {
    if (filter === "ALL") return true;
    return item.severity === filter;
  });

  return (
    <AppShell>
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
          Price Alerts
        </h1>
        <p className="text-sm text-[#6B7280]">
          Active surge triggers and volatility warnings monitored across Indian domestic sectors.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {["ALL", "HIGH", "MEDIUM", "LOW"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f
                ? "bg-airfair-orange text-white shadow-warm-sm"
                : "bg-white border border-[#F1E5DB] text-[#6B7280] hover:text-[#171717]"
            }`}
          >
            {f === "ALL" ? "All Alerts" : `${f.charAt(0) + f.slice(1).toLowerCase()} Severity`}
          </button>
        ))}
      </div>

      {/* Alert Cards List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const isHigh = alert.severity === "HIGH";
          const isMed = alert.severity === "MEDIUM";

          return (
            <div
              key={alert.id}
              className="bg-white border border-[#F1E5DB] hover:border-[#FDBA74] rounded-2xl p-6 shadow-warm-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`mt-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                    isHigh
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : isMed
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {alert.severity}
                </span>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-black text-[#171717]">{alert.route}</h3>
                    <span className="text-xs text-[#9CA3AF]">• {alert.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#6B7280] max-w-2xl">{alert.description}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-lg font-black ${
                    isHigh ? "text-red-600" : isMed ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {alert.percentage}
                </div>
                <div className="text-[11px] text-[#6B7280]">Price Variation</div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
