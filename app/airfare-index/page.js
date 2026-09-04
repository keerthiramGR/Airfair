"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Filter,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import { getIndex, getIndexHistory } from "@/lib/api";

const MONITORED_ROUTES = [
  { origin: "DEL", destination: "BOM", name: "Delhi → Mumbai" },
  { origin: "MAA", destination: "DEL", name: "Chennai → Delhi" },
  { origin: "DEL", destination: "BLR", name: "Delhi → Bengaluru" },
  { origin: "BOM", destination: "BLR", name: "Mumbai → Bengaluru" },
  { origin: "DEL", destination: "CCU", name: "Delhi → Kolkata" },
  { origin: "DEL", destination: "HYD", name: "Delhi → Hyderabad" }
];

const AIRLINES = [
  { code: "", name: "All Airlines (Composite)" },
  { code: "6E", name: "IndiGo (6E)" },
  { code: "AI", name: "Air India (AI)" },
  { code: "QP", name: "Akasa Air (QP)" },
  { code: "SG", name: "SpiceJet (SG)" },
  { code: "IX", name: "Air India Express (IX)" }
];

export default function AirfareIndexPage() {
  const [origin, setOrigin] = useState("DEL");
  const [destination, setDestination] = useState("BOM");
  const [airline, setAirline] = useState("");
  const [range, setRange] = useState("30D");
  const [chartMetric, setChartMetric] = useState("fare"); // 'fare' or 'index'

  const [indexSummary, setIndexSummary] = useState(null);
  const [historySeries, setHistorySeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIndexData = useCallback(async () => {
    setIsLoading(true);
    const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
    try {
      const params = {
        origin,
        destination,
        days: days.toString()
      };
      if (airline) params.airline = airline;

      const [summaryRes, historyRes] = await Promise.allSettled([
        getIndex(params),
        getIndexHistory(params)
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value) {
        setIndexSummary(summaryRes.value);
      }
      if (historyRes.status === "fulfilled" && Array.isArray(historyRes.value)) {
        setHistorySeries(historyRes.value);
      }
    } catch (err) {
      console.warn("Index fetch notice:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, airline, range]);

  useEffect(() => {
    fetchIndexData();
  }, [fetchIndexData]);

  const daysNum = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const isUp = (indexSummary?.percentage_change || 0) > 0;
  const isDown = (indexSummary?.percentage_change || 0) < 0;

  return (
    <AppShell onRefresh={fetchIndexData}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
          Airfare Price Index
        </h1>
        <p className="text-sm text-[#6B7280]">
          Transparent, median-calibrated domestic airfare inflation index powered by verified observations.
        </p>
      </div>

      {/* Corridor & Carrier Filter Bar */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-5 shadow-warm-sm mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-3">
          <Filter size={15} className="text-airfair-orange" />
          <span>Corridor & Carrier Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Corridor Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Flight Corridor
            </label>
            <select
              value={`${origin}-${destination}`}
              onChange={(e) => {
                const [o, d] = e.target.value.split("-");
                setOrigin(o);
                setDestination(d);
              }}
              className="w-full px-3 py-2 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl font-semibold text-[#171717] focus:outline-none focus:border-airfair-orange"
            >
              {MONITORED_ROUTES.map((r) => (
                <option key={`${r.origin}-${r.destination}`} value={`${r.origin}-${r.destination}`}>
                  {r.origin} → {r.destination} ({r.name})
                </option>
              ))}
            </select>
          </div>

          {/* Carrier Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Carrier Segment
            </label>
            <select
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full px-3 py-2 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl font-semibold text-[#171717] focus:outline-none focus:border-airfair-orange"
            >
              {AIRLINES.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Window Buttons */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Historical Lookback
            </label>
            <div className="flex items-center gap-2">
              {["7D", "30D", "90D"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    range === r
                      ? "bg-airfair-orange text-white border-airfair-orange shadow-warm-sm"
                      : "bg-[#FFFCF9] border-[#F1E5DB] text-[#6B7280] hover:bg-[#FFF8F2]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Index KPI Banner */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 sm:p-8 shadow-warm-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
            <span>Airfare Price Index</span>
            <span className="text-[#171717] font-black">{origin} → {destination}</span>
            {airline && <span className="text-airfair-orange font-black">({airline})</span>}
          </div>

          <div className="flex flex-wrap items-baseline gap-4 mb-3">
            <span className="text-5xl sm:text-6xl font-black text-[#171717] tracking-tight">
              {indexSummary?.index_value ? Number(indexSummary.index_value).toFixed(1) : "100.0"}
            </span>

            <div className="flex flex-col">
              <span className="text-2xl font-black text-[#171717]">
                ₹{indexSummary?.current_fare ? Math.round(indexSummary.current_fare).toLocaleString("en-IN") : "—"}
              </span>
              <span className="text-[11px] font-semibold text-[#6B7280]">
                Baseline: ₹{indexSummary?.baseline_fare ? Math.round(indexSummary.baseline_fare).toLocaleString("en-IN") : "—"}
              </span>
            </div>

            <div
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border ${
                isUp
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : isDown
                  ? "text-rose-700 bg-rose-50 border-rose-200"
                  : "text-amber-700 bg-amber-50 border-amber-200"
              }`}
            >
              {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : <Minus size={14} />}
              <span>
                {indexSummary?.percentage_change
                  ? `${indexSummary.percentage_change > 0 ? "+" : ""}${indexSummary.percentage_change}%`
                  : "0.0%"}
              </span>
            </div>

            <span className="px-3 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider bg-[#FFF1E6] text-airfair-orange border border-[#F1E5DB]">
              {indexSummary?.price_band?.replace(/_/g, " ") || "NEAR BASELINE"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
            <div>
              Observed Trend: <span className="font-bold text-[#171717]">{indexSummary?.movement || "STABLE"}</span>
            </div>
            <div>•</div>
            <div>
              Reliability: <span className="font-bold text-emerald-600">{indexSummary?.reliability || "MEDIUM"}</span>
            </div>
            <div>•</div>
            <div>
              Historical Coverage: <span className="font-bold text-[#171717]">{indexSummary?.available_days ?? 0} / {daysNum} days ({indexSummary?.coverage_percentage ?? 0}%)</span>
            </div>
          </div>
        </div>

        {/* Methodology Explainer Box */}
        <div className="p-4 rounded-xl bg-[#FFF8F2] border border-[#F1E5DB] text-xs text-[#6B7280] max-w-sm">
          <div className="font-bold text-[#171717] mb-1.5 flex items-center gap-1.5">
            <Info size={14} className="text-airfair-orange" />
            <span>Explainable Index Formulation</span>
          </div>
          <p className="leading-relaxed mb-2">
            <strong>Index = (Current Fare / Baseline Median) × 100</strong>
          </p>
          <div className="text-[11px] text-[#6B7280]">
            Computed strictly from cleaned non-outlier market observations. Missing historical dates are never fabricated.
          </div>
        </div>
      </div>

      {/* Interactive Price History Chart */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 sm:p-8 shadow-warm-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-black text-[#171717]">Price History & Index Progression</h2>
            <p className="text-xs text-[#6B7280]">
              {historySeries.length} verified date points across {range} window for {origin} → {destination}
            </p>
          </div>

          {/* Metric View Switcher */}
          <div className="inline-flex items-center bg-[#FFF8F2] border border-[#F1E5DB] rounded-xl p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMetric("fare")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartMetric === "fare"
                  ? "bg-airfair-orange text-white shadow-warm-sm"
                  : "text-[#6B7280] hover:text-[#171717]"
              }`}
            >
              ₹ Fare Value
            </button>
            <button
              type="button"
              onClick={() => setChartMetric("index")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartMetric === "index"
                  ? "bg-airfair-orange text-white shadow-warm-sm"
                  : "text-[#6B7280] hover:text-[#171717]"
              }`}
            >
              Index (Base 100)
            </button>
          </div>
        </div>

        {historySeries.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-xs text-[#6B7280]">
            {isLoading ? "Loading verified historical index series..." : "No historical observations recorded for this corridor selection."}
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historySeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="indexChartGrad" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(d) => (d ? d.slice(5) : "")}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  domain={chartMetric === "index" ? [80, "auto"] : ["auto", "auto"]}
                  tickFormatter={(v) => (chartMetric === "fare" ? `₹${v.toLocaleString("en-IN")}` : v)}
                />
                {chartMetric === "index" && (
                  <ReferenceLine y={100} stroke="#9CA3AF" strokeDasharray="4 4" label={{ value: "Base 100", position: "insideTopRight", fill: "#9CA3AF", fontSize: 10 }} />
                )}
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const row = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#F1E5DB] p-3 rounded-xl shadow-warm-md text-xs">
                          <div className="text-[#6B7280] mb-1 font-semibold">{label}</div>
                          <div className="font-bold text-[#171717] mb-0.5">
                            Average Fare: <span className="text-airfair-orange font-black">₹{Math.round(row.fare).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="text-[#6B7280]">
                            Index: <span className="font-bold text-[#171717]">{row.index}</span> ({row.price_band?.replace(/_/g, " ")})
                          </div>
                          <div className="text-[10px] text-[#9CA3AF] mt-1">
                            Observations: {row.observation_count} | Change: {row.percentage_change > 0 ? "+" : ""}{row.percentage_change}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric === "fare" ? "fare" : "index"}
                  stroke="#F97316"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#indexChartGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Date-wise Historical Index Breakdown Table */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
        <h2 className="text-base font-black text-[#171717] mb-1">Date-Wise Index Telemetry</h2>
        <p className="text-xs text-[#6B7280] mb-4">Granular daily observations for {origin} → {destination}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1E5DB] text-[#6B7280] uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Observation Date</th>
                <th className="py-3 px-4">Observed Average Fare</th>
                <th className="py-3 px-4">Index Value</th>
                <th className="py-3 px-4">Day-over-Day Change</th>
                <th className="py-3 px-4">Observed Movement</th>
                <th className="py-3 px-4">Interpretation Band</th>
                <th className="py-3 px-4">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1E5DB]">
              {historySeries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#6B7280]">
                    {isLoading ? "Loading historical telemetry..." : "No observations available for selected filters."}
                  </td>
                </tr>
              ) : (
                historySeries.map((h) => (
                  <tr key={h.date} className="hover:bg-[#FFF8F2] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#171717]">{h.date}</td>
                    <td className="py-3 px-4 font-black text-[#171717]">
                      ₹{Math.round(h.fare).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-black text-airfair-orange">{h.index}</td>
                    <td className="py-3 px-4 font-bold">
                      <span className={h.percentage_change > 0 ? "text-emerald-600" : h.percentage_change < 0 ? "text-rose-600" : "text-gray-600"}>
                        {h.percentage_change > 0 ? "+" : ""}{h.percentage_change}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#FFF8F2] text-[#171717] font-bold text-[10px] border border-[#F1E5DB]">
                        {h.movement}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-[#6B7280] font-semibold">
                        {h.price_band?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">{h.observation_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
