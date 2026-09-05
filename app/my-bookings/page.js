"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Luggage,
  Plane,
  Calendar,
  User,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Receipt,
  ChevronRight,
  Info,
  CreditCard,
  Ticket
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { API_BASE_URL } from "@/lib/api";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.warn("Could not load bookings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleSearchPNR = async () => {
    if (!searchQuery.trim()) {
      loadBookings();
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/pnr/${searchQuery.trim().toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings([data]);
      } else {
        setBookings([]);
      }
    } catch (err) {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${selectedBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setActionSuccess(`Booking ${selectedBooking.booking_reference} has been successfully cancelled. Refund processed.`);
        setCancelModalOpen(false);
        setCancelReason("");
        loadBookings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <AppShell onRefresh={loadBookings}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Title & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1E5DB] pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1E6] text-airfair-orange text-xs font-bold uppercase tracking-wider mb-2">
              <Luggage size={14} />
              <span>Customer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              My Flight Bookings
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Manage reservations, view e-tickets, seat allocations, and cancellation status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search PNR (e.g. AIR-8F92A1)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchPNR()}
                className="px-3.5 py-2 pl-8 text-xs font-semibold rounded-xl border border-[#E5E7EB] bg-white w-64 shadow-warm-xs"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-[#9CA3AF]" />
            </div>
            <button
              type="button"
              onClick={handleSearchPNR}
              className="px-4 py-2 bg-airfair-orange text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-warm-sm"
            >
              Search
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{actionSuccess}</span>
            </div>
            <button type="button" onClick={() => setActionSuccess("")} className="text-emerald-700 font-bold">✕</button>
          </div>
        )}

        {/* Bookings List */}
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-[#F1E5DB]">
            <div className="w-8 h-8 rounded-full border-2 border-airfair-orange border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#6B7280]">Loading bookings from database...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#F1E5DB] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF1E6] text-airfair-orange flex items-center justify-center mx-auto">
              <Ticket size={24} />
            </div>
            <h3 className="text-base font-bold text-[#171717]">No Bookings Found</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              You do not have any active or previous flight bookings under this search query.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-airfair-orange text-white font-bold text-xs sm:text-sm hover:bg-orange-600 shadow-warm-sm"
            >
              <Plane size={15} />
              <span>Book a Flight Now</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isCancelled = b.status.booking_status === "CANCELLED";
              const isConfirmed = b.status.booking_status === "CONFIRMED";

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#F1E5DB] p-5 shadow-warm-xs hover:shadow-warm-md transition-all space-y-4"
                >
                  {/* Top Line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1E5DB] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-airfair-orange flex items-center justify-center font-black text-sm">
                        {b.flight.airline_code}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#171717]">{b.flight.airline_name} ({b.flight.flight_number})</div>
                        <div className="text-[11px] text-[#6B7280]">Travel Date: {b.flight.flight_date} • {b.flight.cabin_class}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-[#9CA3AF] uppercase">AIRFAIR Reference</div>
                        <div className="text-base font-black text-airfair-orange">{b.booking_reference}</div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isConfirmed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isCancelled
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {b.status.booking_status}
                      </span>
                    </div>
                  </div>

                  {/* Route & Passenger Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#FFFCF9] p-4 rounded-xl border border-[#F1E5DB] text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-lg font-black text-[#171717]">{b.flight.origin}</div>
                        <div className="text-[10px] text-[#9CA3AF]">Origin</div>
                      </div>
                      <Plane size={14} className="text-airfair-orange" />
                      <div>
                        <div className="text-lg font-black text-[#171717]">{b.flight.destination}</div>
                        <div className="text-[10px] text-[#9CA3AF]">Destination</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">Travelers ({b.passengers.length})</div>
                      <div className="font-semibold text-[#171717] truncate">
                        {b.passengers.map(p => `${p.first_name} ${p.last_name}`).join(", ") || b.customer.name}
                      </div>
                      {b.seats.length > 0 && (
                        <div className="text-[11px] text-[#6B7280]">
                          Seats: {b.seats.map(s => s.seat_number).join(", ")}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">Airline PNR / E-Ticket</div>
                      <div className="font-semibold text-[#171717]">
                        PNR: <span className="text-blue-600">{b.airline_pnr || "Pending Hold"}</span>
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        Ticket: {b.ticket_number || "Pending GDS Commit"}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">Total Fare</div>
                      <div className="text-base font-black text-[#171717]">
                        ₹{Number(b.financials.total_amount).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        Payment: {b.status.payment_status}
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Record if present */}
                  {b.cancellations && b.cancellations.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1 text-red-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <XCircle size={14} />
                        <span>Cancelled on {String(b.cancellations[0].created_at).slice(0, 10)}</span>
                      </div>
                      <p>Reason: {b.cancellations[0].reason}</p>
                      <p>Refund Amount: ₹{b.cancellations[0].refund_amount.toLocaleString("en-IN")} (Fee: ₹{b.cancellations[0].cancellation_fee.toLocaleString("en-IN")})</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-[#9CA3AF]">
                      Provider: {b.provider_name || "Travelport"} • Status: {b.status.provider_ticketing_status || "PREPROD"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE_URL}/api/bookings/${b.id}/reconcile`, { method: "POST" });
                            if (res.ok) {
                              setActionSuccess(`Reservation status reconciled with Travelport.`);
                              loadBookings();
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-[#6B7280] bg-[#FFFCF9] hover:bg-gray-100 border border-[#E5E7EB] rounded-lg transition-colors"
                      >
                        Reconcile GDS
                      </button>

                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(b);
                            setCancelModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                        >
                          Cancel Booking & Refund
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* CANCELLATION MODAL */}
        {cancelModalOpen && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#F1E5DB] shadow-warm-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1E5DB] pb-3">
                <h3 className="text-base font-bold text-[#171717]">Cancel Flight Reservation</h3>
                <button type="button" onClick={() => setCancelModalOpen(false)} className="text-[#9CA3AF] font-bold">✕</button>
              </div>

              <p className="text-xs text-[#6B7280]">
                Are you sure you want to cancel booking <strong>{selectedBooking.booking_reference}</strong> ({selectedBooking.flight.origin} → {selectedBooking.flight.destination})?
              </p>

              {/* Refund breakdown preview */}
              <div className="p-3 bg-[#FFFCF9] rounded-xl border border-[#F1E5DB] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Total Amount Paid</span>
                  <span className="font-semibold text-[#171717]">₹{selectedBooking.financials.total_amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Airline Cancellation Penalty</span>
                  <span className="font-semibold text-red-600">-₹{Math.min(3000, selectedBooking.financials.total_amount * 0.5).toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-1.5 flex justify-between font-bold text-[#171717]">
                  <span>Net Refund to Source Account</span>
                  <span className="text-emerald-600 font-black">
                    ₹{Math.max(0, selectedBooking.financials.total_amount - Math.min(3000, selectedBooking.financials.total_amount * 0.5)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">Reason for Cancellation</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule change, emergency, personal reason..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7EB] bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] text-xs font-bold"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={!cancelReason.trim() || isCancelling}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isCancelling ? "Processing..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
