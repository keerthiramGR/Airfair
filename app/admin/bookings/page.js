"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Plane,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileText,
  User
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { API_BASE_URL } from "@/lib/api";

export default function AdminBookingsPage() {
  const [data, setData] = useState({ metrics: {}, bookings: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");

  const loadAdminBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/bookings`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn("Could not load admin bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminBookings();
  }, []);

  const metrics = data.metrics || {};
  const bookings = data.bookings || [];

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === "ALL" || b.status.booking_status === statusFilter;
    const matchesSearch =
      !searchFilter.trim() ||
      b.booking_reference.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.customer.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.customer.email.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AppShell onRefresh={loadAdminBookings}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1E5DB] pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1E6] text-airfair-orange text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert size={14} />
              <span>Aviation Operations Admin</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Booking Management Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Operational overview of customer flight reservations, PNR issuances, revenue, and cancellation refunds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/book"
              className="px-4 py-2 bg-airfair-orange text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-warm-sm"
            >
              + Create New Booking
            </Link>
          </div>
        </div>

        {/* 4 Financial & Operational Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#F1E5DB] shadow-warm-xs">
            <div className="text-[11px] font-bold text-[#6B7280] uppercase mb-1">Total Bookings</div>
            <div className="text-2xl font-black text-[#171717]">{metrics.total_bookings ?? 0}</div>
            <div className="text-[10px] text-[#9CA3AF] mt-1">All Recorded Sessions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#F1E5DB] shadow-warm-xs">
            <div className="text-[11px] font-bold text-emerald-600 uppercase mb-1">Confirmed Flights</div>
            <div className="text-2xl font-black text-emerald-600">{metrics.confirmed_bookings ?? 0}</div>
            <div className="text-[10px] text-emerald-700/80 mt-1">Paid / Ticketed</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#F1E5DB] shadow-warm-xs">
            <div className="text-[11px] font-bold text-red-600 uppercase mb-1">Cancelled & Refunded</div>
            <div className="text-2xl font-black text-red-600">{metrics.cancelled_bookings ?? 0}</div>
            <div className="text-[10px] text-red-700/80 mt-1">Penalties Deducted</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#F1E5DB] shadow-warm-xs">
            <div className="text-[11px] font-bold text-blue-600 uppercase mb-1">Gross Revenue</div>
            <div className="text-2xl font-black text-blue-600">
              ₹{(metrics.total_revenue_inr ?? 0).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-blue-700/80 mt-1">Settled in INR</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-xl border border-[#F1E5DB] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search size={14} className="text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by PNR, customer name, email..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-[#FFFCF9] w-full sm:w-80"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-[#6B7280]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold bg-[#FFFCF9]"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Bookings Data Table */}
        <div className="bg-white rounded-2xl border border-[#F1E5DB] overflow-hidden shadow-warm-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFCF9] border-b border-[#F1E5DB] text-[#6B7280] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">AIRFAIR Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Flight</th>
                  <th className="py-3 px-4">Airline PNR / Ticket #</th>
                  <th className="py-3 px-4">Provider / GDS</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1E5DB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                      <div className="w-6 h-6 border-2 border-airfair-orange border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading bookings...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                      No bookings match the specified filter.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FFF8F2] transition-colors">
                      <td className="py-3 px-4 font-black text-airfair-orange">
                        {b.booking_reference}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#171717]">{b.customer.name}</div>
                        <div className="text-[10px] text-[#6B7280]">{b.customer.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#171717]">{b.flight.origin} → {b.flight.destination}</div>
                        <div className="text-[10px] text-[#6B7280]">{b.flight.airline_name} ({b.flight.flight_number}) • {b.flight.flight_date}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-600">PNR: {b.airline_pnr || "Pending Hold"}</div>
                        <div className="text-[10px] text-[#6B7280]">Tkt: {b.ticket_number || "Pending Issuance"}</div>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        <div className="font-semibold text-[#171717]">{b.provider_name || "Travelport"}</div>
                        <div className="text-[10px] text-emerald-600">{b.status.provider_ticketing_status || "PREPROD"}</div>
                      </td>
                      <td className="py-3 px-4 font-black text-[#171717]">
                        ₹{Number(b.financials.total_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status.booking_status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : b.status.booking_status === "CANCELLED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {b.status.booking_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#9CA3AF]">
                        {String(b.created_at).slice(0, 10)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
