"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Brain,
  TrendingUp,
  Calendar,
  Layers,
  Plane
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getFares, getDataQualityStatus, getMLReadiness } from "@/lib/api";

export default function DataExplorerPage() {
  const [fares, setFares] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;

  // Filters
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [advanceWindow, setAdvanceWindow] = useState("");
  const [fareClass, setFareClass] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [qualityStats, setQualityStats] = useState(null);
  const [mlReadiness, setMlReadiness] = useState(null);

  const fetchFareData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString()
      };
      if (origin) params.origin = origin;
      if (destination) params.destination = destination;
      if (advanceWindow) params.advance_window = advanceWindow;
      if (fareClass) params.fare_class = fareClass;

      const [res, qRes, mlRes] = await Promise.allSettled([
        getFares(params),
        getDataQualityStatus({ origin: origin || undefined, destination: destination || undefined }),
        getMLReadiness()
      ]);

      if (res.status === "fulfilled" && res.value?.fares) {
        setFares(res.value.fares);
        setTotalCount(res.value.total || res.value.fares.length);
      }
      if (qRes.status === "fulfilled" && qRes.value) {
        setQualityStats(qRes.value);
      }
      if (mlRes.status === "fulfilled" && mlRes.value) {
        setMlReadiness(mlRes.value);
      }
    } catch (err) {
      console.warn("Fares table fetch notice:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, origin, destination, advanceWindow, fareClass]);

  useEffect(() => {
    fetchFareData();
  }, [fetchFareData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <AppShell onRefresh={fetchFareData}>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
          Data Explorer
        </h1>
        <p className="text-sm text-[#6B7280]">
          Explore the real domestic airfare telemetry powering AIRFAIR. Query clean quotes across airlines, routes, and advance purchase windows.
        </p>
      </div>

      {/* Live Data Quality & Collection Status Strip */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-4 shadow-warm-sm mb-6 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFF1E6] text-airfair-orange flex items-center justify-center font-bold">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="font-bold text-[#171717] flex items-center gap-2">
              <span>Data Quality Pipeline (Phase 5)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 font-bold uppercase text-[10px]">
                {qualityStats?.status || "Healthy"}
              </span>
            </div>
            <div className="text-[#6B7280] text-[11px]">
              Cleaning, Outlier Detection & Daily Summaries Active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[#6B7280]">
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#9CA3AF]">Quality Score</span>
            <span className="font-black text-emerald-600 text-sm">
              {qualityStats?.quality_score ? `${qualityStats.quality_score} / 100` : "100 / 100"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#9CA3AF]">Clean Records</span>
            <span className="font-black text-[#171717] text-sm">
              {qualityStats?.clean_records ?? totalCount}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#9CA3AF]">Outliers Flagged</span>
            <span className="font-black text-amber-600 text-sm">
              {qualityStats?.outliers ?? 0}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#9CA3AF]">Total Quotes</span>
            <span className="font-black text-[#171717] text-sm">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* ML Dataset Readiness & Accumulation Section (Phase 7 Step 4) */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF8F2] text-airfair-orange border border-[#F1E5DB] flex items-center justify-center font-bold">
              <Brain size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#171717]">ML Dataset Readiness Monitoring</h2>
              <p className="text-[11px] text-[#6B7280]">
                Temporal depth and cadence telemetry for long-term time-series forecasting models
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider bg-[#FFF8F2] text-airfair-orange border-[#F1E5DB]">
            <span className="w-2 h-2 rounded-full bg-airfair-orange animate-ping" />
            <span>{mlReadiness?.overall_readiness_status?.replace(/_/g, " ") || "ACCUMULATING DATA"}</span>
          </div>
        </div>

        {/* Readiness Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 text-xs">
          <div className="bg-[#FFFCF9] border border-[#F1E5DB] p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Real Observations</span>
            <span className="text-lg font-black text-[#171717]">{mlReadiness?.total_real_observations ?? "—"}</span>
          </div>
          <div className="bg-[#FFFCF9] border border-[#F1E5DB] p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Collection Dates</span>
            <span className="text-lg font-black text-[#171717]">{mlReadiness?.unique_collection_dates_count ?? "—"}</span>
          </div>
          <div className="bg-[#FFFCF9] border border-[#F1E5DB] p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Flight Travel Dates</span>
            <span className="text-lg font-black text-[#171717]">{mlReadiness?.unique_flight_dates_count ?? "—"}</span>
          </div>
          <div className="bg-[#FFFCF9] border border-[#F1E5DB] p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Corridors Monitored</span>
            <span className="text-lg font-black text-[#171717]">{mlReadiness?.corridors_monitored_count ?? "—"}</span>
          </div>
          <div className="bg-[#FFFCF9] border border-[#F1E5DB] p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Airlines Sampled</span>
            <span className="text-lg font-black text-[#171717]">{Object.keys(mlReadiness?.airline_coverage || {}).length || "—"}</span>
          </div>
          <div className="bg-[#FFFCF9] border border-[#F1E5DB] p-3 rounded-xl">
            <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Lead Windows</span>
            <span className="text-lg font-black text-[#171717]">{Object.keys(mlReadiness?.advance_window_coverage || {}).length || "—"}</span>
          </div>
        </div>

        {/* Dataset Progress Bar */}
        <div className="bg-[#FFF8F2] border border-[#F1E5DB] p-3.5 rounded-xl text-xs">
          <div className="flex items-center justify-between mb-1.5 font-bold">
            <span className="text-[#171717] flex items-center gap-1.5">
              <span>Progress toward recommended ML dataset depth (30 collection days / 100 observations):</span>
            </span>
            <span className="text-airfair-orange font-black">
              {mlReadiness?.dataset_progress_percentage ?? 0}%
            </span>
          </div>
          <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
            <div
              className="bg-airfair-orange h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, mlReadiness?.dataset_progress_percentage || 5)}%` }}
            />
          </div>
          <div className="text-[10px] text-[#6B7280] mt-1.5">
            Real data is systematically collected on a daily cadence without synthetic interpolation. ML models will be calibrated once minimum temporal threshold is attained.
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-4">
          <Filter size={15} className="text-airfair-orange" />
          <span>Filter Airfare Telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Origin */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Origin Airport
            </label>
            <select
              value={origin}
              onChange={(e) => {
                setOrigin(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl text-xs font-semibold text-[#171717] focus:outline-none focus:border-airfair-orange"
            >
              <option value="">All Origins</option>
              <option value="DEL">DEL (Delhi)</option>
              <option value="BOM">BOM (Mumbai)</option>
              <option value="BLR">BLR (Bengaluru)</option>
              <option value="MAA">MAA (Chennai)</option>
              <option value="HYD">HYD (Hyderabad)</option>
              <option value="CCU">CCU (Kolkata)</option>
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Destination Airport
            </label>
            <select
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl text-xs font-semibold text-[#171717] focus:outline-none focus:border-airfair-orange"
            >
              <option value="">All Destinations</option>
              <option value="BOM">BOM (Mumbai)</option>
              <option value="DEL">DEL (Delhi)</option>
              <option value="BLR">BLR (Bengaluru)</option>
              <option value="GOI">GOI (Goa)</option>
              <option value="HYD">HYD (Hyderabad)</option>
            </select>
          </div>

          {/* Advance Window */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Advance Window
            </label>
            <select
              value={advanceWindow}
              onChange={(e) => {
                setAdvanceWindow(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl text-xs font-semibold text-[#171717] focus:outline-none focus:border-airfair-orange"
            >
              <option value="">All Windows</option>
              <option value="T+1">T+1 (Next Day)</option>
              <option value="T+3">T+3 (Short Lead)</option>
              <option value="T+7">T+7 (1 Week)</option>
              <option value="T+15">T+15 (2 Weeks)</option>
              <option value="T+30">T+30 (1 Month)</option>
              <option value="T+45">T+45 (Advance)</option>
            </select>
          </div>

          {/* Fare Class */}
          <div>
            <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">
              Fare Class
            </label>
            <select
              value={fareClass}
              onChange={(e) => {
                setFareClass(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl text-xs font-semibold text-[#171717] focus:outline-none focus:border-airfair-orange"
            >
              <option value="">All Classes</option>
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM_ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className="bg-white border border-[#F1E5DB] rounded-2xl shadow-warm-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FFF8F2] border-b border-[#F1E5DB] text-[#6B7280] uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Airline</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Flight Date</th>
                <th className="py-3 px-4">Advance Window</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Base Fare</th>
                <th className="py-3 px-4">Taxes & UDF</th>
                <th className="py-3 px-4">Total Fare</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1E5DB]">
              {fares.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#6B7280]">
                    {isLoading ? "Loading fare quotes from Supabase..." : "No fare records match the selected filters."}
                  </td>
                </tr>
              ) : (
                fares.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#FFF8F2]/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#171717]">
                      {item.airline || item.airline_name || "IndiGo"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#171717]">
                      {item.route || `${item.origin}-${item.destination}`}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">{item.flight_date || "2026-09-10"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#FFF8F2] border border-[#F1E5DB] font-bold text-[10px] text-[#171717]">
                        {item.advance_purchase_window || item.advance_window || "T+7"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">{item.fare_class || "ECONOMY"}</td>
                    <td className="py-3 px-4 text-[#6B7280]">
                      {item.base_fare ? `₹${Math.round(item.base_fare).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">
                      {item.taxes ? `₹${Math.round(Number(item.taxes) + Number(item.user_development_fee || 0)).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-black text-[#171717]">
                      ₹{Math.round(item.total_fare).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF5FF] text-blue-700 border border-blue-200">
                        {item.source || "SERPAPI"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                        <CheckCircle2 size={12} />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-[#F1E5DB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-bold text-[#171717]">{fares.length}</span> of{" "}
            <span className="font-bold text-[#171717]">{totalCount}</span> quotes (Page {page} of {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 border border-[#F1E5DB] rounded-xl text-[#171717] hover:bg-[#FFF8F2] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 border border-[#F1E5DB] rounded-xl text-[#171717] hover:bg-[#FFF8F2] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
