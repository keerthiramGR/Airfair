"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Plane,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import { getDashboard, getIndex, getRoutes, getAlerts } from "@/lib/api";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [indexTimeline, setIndexTimeline] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trendRange, setTrendRange] = useState("30D");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("Just now");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dash, idxData, routeList, alertList] = await Promise.all([
        getDashboard().catch(() => null),
        getIndex(trendRange === "7D" ? 7 : trendRange === "30D" ? 30 : 90).catch(() => null),
        getRoutes().catch(() => null),
        getAlerts().catch(() => null)
      ]);

      if (dash) {
        setDashboardData(dash);
        if (dash.last_updated) {
          const d = new Date(dash.last_updated);
          setLastUpdated(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      }

      if (idxData?.timeline) {
        setIndexTimeline(idxData.timeline);
      }

      if (routeList?.routes) {
        setRoutes(routeList.routes.slice(0, 4));
      }

      if (alertList?.alerts) {
        setAlerts(alertList.alerts.slice(0, 3));
      }
    } catch (err) {
      console.warn("Dashboard fetch notice:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [trendRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const indexVal = dashboardData?.airfare_index ?? 120.4;
  const indexChange = dashboardData?.index_change ?? 8.2;
  const avgFare = dashboardData?.average_fare ?? 6097;
  const routesCount = dashboardData?.routes_monitored ?? 12;
  const alertCount = dashboardData?.active_alerts ?? 10;

  return (
    <AppShell onRefresh={fetchData} lastUpdated={lastUpdated}>
      {/* Header Greeting */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF1E6] text-airfair-orange text-xs font-bold uppercase tracking-wider mb-2">
          <span>Executive Overview</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
          Good morning
        </h1>
        <p className="text-sm text-[#6B7280]">
          India's airfare market at a glance. Real-time index and corridor intelligence.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* 4 CLEAN KPI CARDS (White with light orange accent)                   */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card 1: Airfare Index */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] mb-3">
            <span>Airfare Index</span>
            <span className="p-1.5 rounded-lg bg-[#FFF1E6] text-airfair-orange">
              <LineChartIcon size={16} />
            </span>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight mb-2">
            {indexVal.toFixed(1)}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} />
            <span>+{indexChange}% vs baseline</span>
          </div>
        </div>

        {/* Card 2: Average Fare */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] mb-3">
            <span>Average Fare</span>
            <span className="p-1.5 rounded-lg bg-[#FFF1E6] text-airfair-orange">
              <Plane size={16} />
            </span>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight mb-2">
            ₹{avgFare.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp size={14} />
            <span>+5.6% past 30 days</span>
          </div>
        </div>

        {/* Card 3: Routes Monitored */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] mb-3">
            <span>Routes Monitored</span>
            <span className="p-1.5 rounded-lg bg-[#FFF8F2] text-[#6B7280]">
              <Layers size={16} />
            </span>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight mb-2">
            {routesCount}
          </div>
          <div className="text-xs text-[#6B7280]">
            Major domestic corridors
          </div>
        </div>

        {/* Card 4: Active Alerts */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-5 shadow-warm-sm hover:shadow-warm-md transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] mb-3">
            <span>Active Alerts</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight mb-2">
            {alertCount}
          </div>
          <div className="text-xs text-amber-600 font-semibold">
            Price surge events detected
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AIRFARE PRICE TREND (Large Clean Chart)                               */}
      {/* ===================================================================== */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-[#171717] tracking-tight">
              Airfare Price Trend
            </h2>
            <p className="text-xs text-[#6B7280]">
              Historical daily price index across Indian domestic corridors.
            </p>
          </div>

          {/* Time Range Controls */}
          <div className="inline-flex items-center bg-[#FFF8F2] border border-[#F1E5DB] rounded-xl p-1 text-xs font-bold">
            {["7D", "30D", "90D"].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTrendRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  trendRange === range
                    ? "bg-airfair-orange text-white shadow-warm-sm"
                    : "text-[#6B7280] hover:text-[#171717]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Clean Line / Area Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={indexTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1E5DB" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => {
                  if (!val) return "";
                  const parts = val.split("-");
                  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                }}
              />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[#F1E5DB] p-3 rounded-xl shadow-warm-md text-xs">
                        <div className="text-[#6B7280] mb-1">{label}</div>
                        <div className="font-bold text-[#171717] flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-airfair-orange" />
                          Index: <span className="text-airfair-orange font-black">{payload[0].value}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="index_value"
                stroke="#F97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorIndex)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2-COLUMN SECTION: Popular Routes + Recent Alerts                     */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Popular Corridors */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-[#171717]">Popular Corridors</h2>
              <p className="text-xs text-[#6B7280]">Key domestic metro trunk routes</p>
            </div>
            <Link
              href="/routes"
              className="text-xs font-bold text-airfair-orange hover:underline flex items-center gap-1"
            >
              <span>View all routes</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {routes.map((rt) => (
              <div
                key={rt.route_code || `${rt.origin}-${rt.destination}`}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#F1E5DB] hover:border-[#FDBA74] hover:bg-[#FFF8F2] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] text-airfair-orange flex items-center justify-center font-bold text-xs">
                    <Plane size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#171717]">
                      {rt.origin} → {rt.destination}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      {rt.origin_name || rt.origin} to {rt.destination_name || rt.destination}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-[#171717]">
                    ₹{(rt.average_fare || rt.current_average || 7850).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600">
                    +{(rt.fare_change_pct || 11.8).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Alerts */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-[#171717]">Recent Alerts</h2>
              <p className="text-xs text-[#6B7280]">Surges and anomalies detected</p>
            </div>
            <Link
              href="/alerts"
              className="text-xs font-bold text-airfair-orange hover:underline flex items-center gap-1"
            >
              <span>View all alerts</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {alerts.map((al, idx) => {
              const isHigh = al.severity === "HIGH" || al.severity === "HIGH_SURGE";
              return (
                <div
                  key={al.id || idx}
                  className="p-3.5 rounded-xl border border-[#F1E5DB] hover:border-[#FDBA74] transition-all flex items-start gap-3"
                >
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      isHigh
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {al.severity || "HIGH"}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#171717] mb-0.5">
                      {al.route_code || al.route || "DEL → BOM"}
                    </div>
                    <div className="text-xs text-[#6B7280] leading-snug">
                      {al.message || al.description || "Fare increased significantly above 30-day baseline."}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
