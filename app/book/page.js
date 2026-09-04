"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Plane,
  User,
  Luggage,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Ticket,
  Clock,
  Calendar,
  CalendarRange,
  IndianRupee,
  Coffee,
  Check,
  Info,
  Search,
  Filter,
  MapPin,
  TrendingDown,
  TrendingUp,
  Zap,
  BellRing,
  CalendarCheck,
  CalendarDays,
  Flame,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  ArrowLeftRight
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";

const ALL_AIRPORTS = [
  { code: "DEL", city: "Delhi", name: "Indira Gandhi International" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda International" },
  { code: "MAA", city: "Chennai", name: "Chennai International" },
  { code: "CCU", city: "Kolkata", name: "Netaji Subhash Chandra Bose" },
  { code: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International" },
  { code: "AMD", city: "Ahmedabad", name: "Sardar Vallabhbhai Patel" },
  { code: "GOI", city: "Goa", name: "Dabolim / Mopa International" },
  { code: "PNQ", city: "Pune", name: "Pune International Airport" },
  { code: "COK", city: "Kochi", name: "Cochin International Airport" },
  { code: "JAI", city: "Jaipur", name: "Jaipur International Airport" }
];

const SEAT_ROWS = [1, 2, 3, 4, 5, 6];
const SEAT_COLS = ["A", "B", "C", "D", "E", "F"];

// Generate 30-day forward price trend data with realistic variation
function generate30DayPriceTrends(basePrice = 5500, airlineCode = "6E") {
  const trends = [];
  const today = new Date(2026, 8, 4); // 2026-09-04
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let lowestPrice = Infinity;
  let lowestIndex = -1;

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isMidweek = d.getDay() === 2 || d.getDay() === 3; // Tue/Wed usually cheapest

    // Price variation logic: T+1 to T+3 are higher, mid-range lower, weekends higher
    let factor = 1.0;
    if (i < 3) factor = 1.28 + (3 - i) * 0.08; // close-in departure surge
    else if (i >= 12 && i <= 21 && isMidweek) factor = 0.82; // sweet spot
    else if (isWeekend) factor = 1.15;
    else factor = 0.95 + ((i * 7) % 15) / 100;

    const estimatedFare = Math.round((basePrice * factor) / 50) * 50;
    if (estimatedFare < lowestPrice) {
      lowestPrice = estimatedFare;
      lowestIndex = i;
    }

    const prevEst = i > 0 ? trends[i - 1].fare : estimatedFare * 1.05;
    const diffPct = Math.round(((estimatedFare - prevEst) / prevEst) * 100);

    trends.push({
      index: i,
      dateObj: d,
      dateString: d.toISOString().split("T")[0],
      dayName: dayNames[d.getDay()],
      monthName: monthNames[d.getMonth()],
      dayNum: d.getDate(),
      fare: estimatedFare,
      diffPct: diffPct,
      trend: diffPct > 2 ? "INCREASING" : diffPct < -2 ? "DECREASING" : "STABLE",
      isWeekend,
      isLowest: false
    });
  }

  if (lowestIndex >= 0) {
    trends[lowestIndex].isLowest = true;
  }

  return trends;
}

export default function BookFlightPage() {
  // Stepper: 1: Route & Flight, 2: Travel Date, 3: 30-Day Booking Calendar (auto-book date), 4: Passenger Info, 5: Seats & Addons, 6: Confirmed
  const [step, setStep] = useState(1);
  const [quotes, setQuotes] = useState([]);
  const [selectedOrigin, setSelectedOrigin] = useState("DEL");
  const [selectedDestination, setSelectedDestination] = useState("BOM");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  // Travel Date State (actual departure date — must be ≥30 days from today)
  const minTravelDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);
  const [travelDate, setTravelDate] = useState("");
  const [travelDateError, setTravelDateError] = useState("");

  // 30-Day Booking Calendar State (when to purchase — auto-book date)
  const [priceTrends, setPriceTrends] = useState([]);
  const [selectedDateTrend, setSelectedDateTrend] = useState(null);
  const [isAutoBookMode, setIsAutoBookMode] = useState(true);

  // Passenger & Contact State
  const [customer, setCustomer] = useState({
    name: "Aditya Kumar",
    email: "aditya.kumar@example.com",
    phone: "+91 98765 43210"
  });

  const [passengers, setPassengers] = useState([
    {
      title: "Mr",
      first_name: "Aditya",
      last_name: "Kumar",
      gender: "Male",
      date_of_birth: "1995-06-15",
      passport_or_id: "IND-A9283719"
    }
  ]);

  const [selectedSeats, setSelectedSeats] = useState({});
  const [selectedAddOns, setSelectedAddOns] = useState({
    baggage_10kg: false,
    meal_gourmet: false,
    travel_insurance: true,
    priority_boarding: false
  });

  const [createdBooking, setCreatedBooking] = useState(null);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load Quotes from Backend
  useEffect(() => {
    async function load() {
      setIsLoadingQuotes(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/fares?limit=100");
        if (res.ok) {
          const data = await res.json();
          const items = data.items || data.quotes || [];
          setQuotes(items);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setIsLoadingQuotes(false);
      }
    }
    load();
  }, []);

  // Filter Shortlisted Flights based on Origin & Destination
  const shortlistedFlights = useMemo(() => {
    const directMatches = quotes.filter(
      (q) => q.origin === selectedOrigin && q.destination === selectedDestination
    );

    if (directMatches.length > 0) {
      return directMatches;
    }

    // Default synthesis if specific pair not in quote database yet
    return [
      {
        id: 901,
        origin: selectedOrigin,
        destination: selectedDestination,
        airline_code: "6E",
        airline_name: "IndiGo",
        flight_number: "6E-204",
        total_fare: 5450.0,
        base_fare: 4469.0,
        flight_date: "2026-09-04",
        source: "SERPAPI"
      },
      {
        id: 902,
        origin: selectedOrigin,
        destination: selectedDestination,
        airline_code: "AI",
        airline_name: "Air India",
        flight_number: "AI-805",
        total_fare: 6200.0,
        base_fare: 5084.0,
        flight_date: "2026-09-04",
        source: "SERPAPI"
      },
      {
        id: 903,
        origin: selectedOrigin,
        destination: selectedDestination,
        airline_code: "QP",
        airline_name: "Akasa Air",
        flight_number: "QP-1314",
        total_fare: 4950.0,
        base_fare: 4059.0,
        flight_date: "2026-09-04",
        source: "SERPAPI"
      }
    ];
  }, [quotes, selectedOrigin, selectedDestination]);

  // Set default selected flight when shortlisted flights change
  useEffect(() => {
    if (shortlistedFlights.length > 0 && (!selectedFlight || selectedFlight.origin !== selectedOrigin || selectedFlight.destination !== selectedDestination)) {
      const flight = shortlistedFlights[0];
      setSelectedFlight(flight);
      const trends = generate30DayPriceTrends(flight.total_fare, flight.airline_code);
      setPriceTrends(trends);
      // Select lowest fare day by default
      const lowestDay = trends.find(t => t.isLowest) || trends[0];
      setSelectedDateTrend(lowestDay);
    }
  }, [shortlistedFlights, selectedOrigin, selectedDestination]);

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
    const trends = generate30DayPriceTrends(flight.total_fare, flight.airline_code);
    setPriceTrends(trends);
    const lowestDay = trends.find(t => t.isLowest) || trends[0];
    setSelectedDateTrend(lowestDay);
  };

  const handleAddPassenger = () => {
    setPassengers([
      ...passengers,
      {
        title: "Ms",
        first_name: "",
        last_name: "",
        gender: "Female",
        date_of_birth: "",
        passport_or_id: ""
      }
    ]);
  };

  const handleRemovePassenger = (index) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index));
    }
  };

  const handlePassengerChange = (index, field, val) => {
    const updated = [...passengers];
    updated[index][field] = val;
    setPassengers(updated);
  };

  const toggleSeat = (seatId, seatType, price) => {
    const updated = { ...selectedSeats };
    if (updated[seatId]) {
      delete updated[seatId];
    } else {
      const currentAssignedCount = Object.keys(updated).length;
      if (currentAssignedCount < passengers.length) {
        const passIndex = currentAssignedCount;
        updated[seatId] = {
          seat_number: seatId,
          seat_type: seatType,
          price: price,
          passenger_name: `${passengers[passIndex]?.first_name || 'Passenger'} ${passengers[passIndex]?.last_name || ''}`
        };
      }
    }
    setSelectedSeats(updated);
  };

  // Financial Calculations based on selected date fare
  const pCount = passengers.length;
  const currentTotalFare = selectedDateTrend ? selectedDateTrend.fare : (selectedFlight ? selectedFlight.total_fare : 5500);
  const unitBase = currentTotalFare * 0.82;
  const unitTaxes = currentTotalFare * 0.12;
  const unitUdf = 150;
  const unitConv = 250;

  const baseFareTotal = unitBase * pCount;
  const taxesTotal = unitTaxes * pCount;
  const udfTotal = unitUdf * pCount;
  const convTotal = unitConv * pCount;

  const seatsTotal = Object.values(selectedSeats).reduce((acc, s) => acc + s.price, 0);

  let addOnsTotal = 0;
  if (selectedAddOns.baggage_10kg) addOnsTotal += 900 * pCount;
  if (selectedAddOns.meal_gourmet) addOnsTotal += 450 * pCount;
  if (selectedAddOns.travel_insurance) addOnsTotal += 249 * pCount;
  if (selectedAddOns.priority_boarding) addOnsTotal += 350 * pCount;

  const grandTotal = baseFareTotal + taxesTotal + udfTotal + convTotal + seatsTotal + addOnsTotal;

  // Final Auto-Booking Handler
  const handleFinalizeBooking = async () => {
    setIsProcessing(true);
    setErrorMessage("");
    try {
      // 1. Initiate booking in FastAPI with full flight, corridor & date details
      const initRes = await fetch("http://127.0.0.1:8000/api/bookings/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: selectedFlight?.id ? (selectedFlight.id < 900 ? selectedFlight.id : null) : null,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          cabin_class: "ECONOMY",
          origin: selectedOrigin,
          destination: selectedDestination,
          flight_date: travelDate || "2026-10-04",
          scheduled_booking_date: selectedDateTrend?.dateString || new Date().toISOString().split("T")[0],
          airline_code: selectedFlight?.airline_code || "6E",
          airline_name: selectedFlight?.airline_name || "IndiGo",
          flight_number: selectedFlight?.flight_number || `${selectedFlight?.airline_code || '6E'}-204`,
          total_fare: selectedDateTrend?.fare || selectedFlight?.total_fare || 5450.0
        })
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        throw new Error(errJson.detail || "Failed to initialize booking session.");
      }
      const initData = await initRes.json();
      const bookingId = initData.booking.id;


      // 2. Attach Passengers
      await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/passengers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passengers })
      });

      // 3. Attach Seats if any
      const seatsPayload = Object.values(selectedSeats).map(s => ({
        seat_number: s.seat_number,
        seat_class: "ECONOMY",
        seat_type: s.seat_type,
        price: s.price
      }));
      if (seatsPayload.length > 0) {
        await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/seats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seats: seatsPayload })
        });
      }

      // 4. Attach Add-ons
      const addonsPayload = [];
      if (selectedAddOns.baggage_10kg) addonsPayload.push({ category: "BAGGAGE", title: "Excess Baggage 10kg", unit_price: 900.0, quantity: pCount });
      if (selectedAddOns.meal_gourmet) addonsPayload.push({ category: "MEAL", title: "Hot Gourmet Meal", unit_price: 450.0, quantity: pCount });
      if (selectedAddOns.travel_insurance) addonsPayload.push({ category: "INSURANCE", title: "Domestic Travel Insurance", unit_price: 249.0, quantity: pCount });
      if (selectedAddOns.priority_boarding) addonsPayload.push({ category: "PRIORITY_BOARDING", title: "Priority Baggage & Boarding", unit_price: 350.0, quantity: pCount });

      if (addonsPayload.length > 0) {
        await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/add-ons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ add_ons: addonsPayload })
        });
      }

      // 5. Checkout / Prepare Payment Intent
      const payRes = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const payData = await payRes.json();

      // 6. Verify & Issue / Schedule
      const verifyRes = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: payData.order.checkout_payload.order_id,
          payment_id: `pay_autobook_${Date.now()}`,
          signature: "sandbox_signature"
        })
      });
      const verifyData = await verifyRes.json();

      setCreatedBooking(verifyData.booking);
      setCheckoutOrder(payData.order);
      setStep(6);
    } catch (err) {
      setErrorMessage(err.message || "An error occurred while booking.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1E5DB] pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1E6] text-airfair-orange text-xs font-bold uppercase tracking-wider mb-2">
              <Zap size={14} />
              <span>Smart Auto-Booking & 30-Day Fare Forecast</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Flight Booking & Price Radar
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Select your travel date, pick the cheapest day to book, and let AIRFAIR auto-purchase your ticket.
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 text-xs font-bold">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all text-[10px] sm:text-xs ${
                    step === s
                      ? "bg-airfair-orange text-white ring-4 ring-[#FFE2D1]"
                      : step > s
                      ? "bg-emerald-500 text-white"
                      : "bg-white border border-[#E5E7EB] text-[#9CA3AF]"
                  }`}
                >
                  {step > s ? <Check size={12} /> : s}
                </div>
                {s < 6 && <div className={`w-3 sm:w-4 h-0.5 ${step > s ? "bg-emerald-400" : "bg-[#E5E7EB]"}`} />}
              </div>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CHOOSE FROM & TO -> SHORTLIST FLIGHTS */}
        {step === 1 && (
          <div className="space-y-6">
            
            {/* Origin and Destination Card */}
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#171717]">Step 1: Choose Corridor (From & To)</h2>
                  <p className="text-xs text-[#6B7280]">Select your departure and arrival airports to instantly shortlist flights.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const temp = selectedOrigin;
                    setSelectedOrigin(selectedDestination);
                    setSelectedDestination(temp);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-airfair-orange bg-[#FFF1E6] hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Swap Cities</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* From Origin */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1.5 flex items-center gap-1.5">
                    <MapPin size={13} className="text-airfair-orange" />
                    <span>From (Departure City)</span>
                  </label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => {
                      if (e.target.value === selectedDestination) {
                        setSelectedDestination(selectedOrigin);
                      }
                      setSelectedOrigin(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm font-bold bg-[#FFFCF9] text-[#171717] focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    {ALL_AIRPORTS.map((a) => (
                      <option key={a.code} value={a.code} disabled={a.code === selectedDestination}>
                        {a.city} ({a.code}) — {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Destination */}
                <div>
                  <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1.5 flex items-center gap-1.5">
                    <MapPin size={13} className="text-emerald-600" />
                    <span>To (Arrival City)</span>
                  </label>
                  <select
                    value={selectedDestination}
                    onChange={(e) => {
                      if (e.target.value === selectedOrigin) {
                        setSelectedOrigin(selectedDestination);
                      }
                      setSelectedDestination(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm font-bold bg-[#FFFCF9] text-[#171717] focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    {ALL_AIRPORTS.map((a) => (
                      <option key={a.code} value={a.code} disabled={a.code === selectedOrigin}>
                        {a.city} ({a.code}) — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Shortlisted Flights for this corridor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#171717]">
                  Shortlisted Flights for {selectedOrigin} → {selectedDestination} ({shortlistedFlights.length})
                </h3>
                <span className="text-xs text-[#6B7280]">Select a flight to view 30-day price trends</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shortlistedFlights.map((flight) => {
                  const isSelected = selectedFlight?.id === flight.id;
                  return (
                    <div
                      key={flight.id}
                      onClick={() => handleSelectFlight(flight)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                        isSelected
                          ? "border-airfair-orange ring-2 ring-[#FFD8C2] shadow-warm-md scale-[1.02]"
                          : "border-[#F1E5DB] hover:border-orange-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-airfair-orange flex items-center justify-center font-black text-xs">
                            {flight.airline_code || "6E"}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#171717]">{flight.airline_name}</div>
                            <div className="text-[11px] text-[#6B7280]">{flight.flight_number || `Flight ${flight.airline_code}-502`}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black text-[#171717]">
                            ₹{Number(flight.total_fare).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-[#9CA3AF]">Base rate</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 bg-[#FFFCF9] rounded-xl border border-[#F1E5DB] text-xs">
                        <span className="font-bold text-[#171717]">{flight.origin}</span>
                        <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                          <span>Non-stop</span>
                          <Plane size={12} className="text-airfair-orange" />
                        </div>
                        <span className="font-bold text-[#171717]">{flight.destination}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <Sparkles size={12} />
                          <span>30-Day Trend Ready</span>
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-orange-100 text-airfair-orange font-bold text-[10px] rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#F1E5DB]">
              <div className="text-xs text-[#6B7280]">
                Selected Flight: <strong className="text-[#171717]">{selectedFlight?.airline_name} ({selectedFlight?.flight_number || selectedFlight?.airline_code})</strong> for <strong className="text-[#171717]">{selectedOrigin} → {selectedDestination}</strong>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-warm-sm"
              >
                <span>Continue: Select Travel Date</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TRAVEL DATE SELECTION (actual departure date) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarRange size={18} className="text-airfair-orange" />
                  <h2 className="text-base font-bold text-[#171717]">Step 2: Select Your Travel Date</h2>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Choose the date you want to <strong>fly</strong> (depart). This is different from when you purchase the ticket.
                </p>
              </div>

              {/* Why book early info card */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                  <Info size={16} />
                  <span>Why book 1 month in advance?</span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Airlines typically offer the lowest fares when you book <strong>30+ days</strong> before departure. 
                  Last-minute bookings often cost 25–50% more. By selecting your travel date first, 
                  AIRFAIR can show you the <strong>cheapest day to purchase</strong> your ticket in the next 30 days, 
                  and automatically book it for you on that day.
                </p>
                <div className="flex items-center gap-4 pt-1 text-[11px] font-bold text-blue-600">
                  <span className="flex items-center gap-1"><TrendingDown size={12} /> Early booking = Lower fares</span>
                  <span className="flex items-center gap-1"><Zap size={12} /> Auto-book on the cheapest day</span>
                </div>
              </div>

              {/* Route context banner */}
              <div className="flex items-center gap-3 p-3 bg-[#FFFCF9] rounded-xl border border-[#F1E5DB]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#171717]">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] text-airfair-orange flex items-center justify-center font-black text-[10px]">
                    {selectedFlight?.airline_code || "6E"}
                  </div>
                  <span>{selectedFlight?.airline_name}</span>
                  <span className="text-[#9CA3AF]">•</span>
                  <span>{selectedOrigin} → {selectedDestination}</span>
                </div>
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#6B7280] uppercase flex items-center gap-1.5">
                  <Calendar size={13} className="text-airfair-orange" />
                  <span>Travel / Departure Date</span>
                </label>
                <input
                  type="date"
                  value={travelDate}
                  min={minTravelDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTravelDate(val);
                    if (val && val < minTravelDate) {
                      setTravelDateError(`Travel date must be at least 30 days from today (${minTravelDate} or later).`);
                    } else {
                      setTravelDateError("");
                    }
                  }}
                  className="w-full sm:w-80 px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm font-bold bg-[#FFFCF9] text-[#171717] focus:ring-2 focus:ring-orange-200 outline-none"
                />
                <p className="text-[11px] text-[#9CA3AF]">
                  Earliest available: <strong>{minTravelDate}</strong> (30 days from today)
                </p>
                {travelDateError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                    <AlertCircle size={13} />
                    <span>{travelDateError}</span>
                  </div>
                )}
              </div>

              {/* Selected date confirmation */}
              {travelDate && !travelDateError && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-800 uppercase">Travel Date Selected</div>
                    <div className="text-sm font-black text-[#171717]">
                      {new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Next step: pick the best day to <strong>purchase</strong> your ticket from the 30-day booking calendar.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#F1E5DB]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-bold text-xs sm:text-sm flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!travelDate || !!travelDateError}
                onClick={() => {
                  setErrorMessage("");
                  setStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-warm-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue: View 30-Day Booking Calendar</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 30-DAY PREDICTIVE PRICE CALENDAR & DATE SELECTOR */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1E5DB] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-airfair-orange" />
                    <h2 className="text-base font-bold text-[#171717]">
                      30-Day Booking Calendar — {selectedFlight?.airline_name} ({selectedOrigin} → {selectedDestination})
                    </h2>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Pick the <strong>cheapest day to purchase</strong> your ticket. Your travel date is <strong>{travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong>. Click a date below to schedule auto-booking.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-[11px] text-[#6B7280]">Best Price (Cheapest)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-[11px] text-[#6B7280]">Low / Decreasing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-rose-400" />
                    <span className="text-[11px] text-[#6B7280]">Peak / High Fare</span>
                  </div>
                </div>
              </div>

              {/* 30-Day Calendar Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {priceTrends.map((t) => {
                  const isSelected = selectedDateTrend?.dateString === t.dateString;
                  const isLowest = t.isLowest;
                  const isIncreasing = t.trend === "INCREASING";
                  const isDecreasing = t.trend === "DECREASING";

                  return (
                    <div
                      key={t.dateString}
                      onClick={() => setSelectedDateTrend(t)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative text-center flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#FFF8F2] border-airfair-orange ring-2 ring-orange-300 shadow-warm-sm scale-105 z-10"
                          : isLowest
                          ? "bg-emerald-50/70 border-emerald-300 hover:border-emerald-500"
                          : isIncreasing
                          ? "bg-rose-50/50 border-rose-200 hover:border-rose-400"
                          : "bg-white border-[#F1E5DB] hover:border-orange-200"
                      }`}
                    >
                      {/* Top Badge */}
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#6B7280] mb-1">
                        <span>{t.dayName}</span>
                        <span>{t.monthName} {t.dayNum}</span>
                      </div>

                      {/* Price */}
                      <div className="my-1">
                        <div className={`text-sm font-black ${
                          isLowest ? "text-emerald-700" : isIncreasing ? "text-rose-700" : "text-[#171717]"
                        }`}>
                          ₹{t.fare.toLocaleString("en-IN")}
                        </div>

                        {/* Trend badge */}
                        <div className="flex items-center justify-center gap-0.5 text-[10px] mt-0.5 font-bold">
                          {isLowest ? (
                            <span className="text-emerald-600 bg-emerald-100/80 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              <Flame size={10} /> Best Deal
                            </span>
                          ) : isDecreasing ? (
                            <span className="text-blue-600 flex items-center">
                              <ArrowDownRight size={11} /> {Math.abs(t.diffPct)}%
                            </span>
                          ) : isIncreasing ? (
                            <span className="text-rose-500 flex items-center">
                              <ArrowUpRight size={11} /> +{t.diffPct}%
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF]">Stable</span>
                          )}
                        </div>
                      </div>

                      {/* Auto-Book Scheduled Indicator */}
                      <div className="mt-1 pt-1 border-t border-[#F1E5DB]/60">
                        {isSelected ? (
                          <span className="text-[10px] font-black text-airfair-orange flex items-center justify-center gap-1">
                            <CheckCircle2 size={11} /> Auto-Book Scheduled ✅
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#9CA3AF]">Click to Schedule</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Date Summary Banner — shows both dates */}
              {selectedDateTrend && (
                <div className="p-4 bg-[#FFFCF9] border-2 border-orange-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-airfair-orange text-white flex items-center justify-center">
                        <CalendarCheck size={22} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-airfair-orange uppercase">Scheduled Auto-Book Date (Purchase Day)</div>
                        <div className="text-base font-black text-[#171717]">
                          {selectedDateTrend.dayName}, {selectedDateTrend.monthName} {selectedDateTrend.dayNum}, 2026 ({selectedDateTrend.dateString})
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          Fare: <strong className="text-emerald-700">₹{selectedDateTrend.fare.toLocaleString("en-IN")} per adult</strong> • {selectedDateTrend.isLowest ? "Lowest fare detected in next 30 days!" : "Selected for auto-purchase"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                        <Zap size={14} />
                        <span>Auto-Book Scheduled</span>
                      </div>
                    </div>
                  </div>

                  {/* Travel date reminder */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                    <Plane size={16} className="text-blue-600 shrink-0" />
                    <div className="text-xs text-blue-800">
                      <strong>Travel Date (Departure):</strong>{" "}
                      {travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                    AIRFAIR will automatically purchase your <strong>{selectedOrigin} → {selectedDestination}</strong> ticket on <strong>{selectedDateTrend.dateString}</strong> at the predicted fare of ₹{selectedDateTrend.fare.toLocaleString("en-IN")}. Your flight departs on <strong>{travelDate}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#F1E5DB]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-bold text-xs sm:text-sm flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back to Travel Date</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-warm-sm"
              >
                <span>Continue: Enter Traveler Details</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: TRAVELER INFORMATION (moved from old Step 2) */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Step 4: Traveler & Contact Information</h2>
                <p className="text-xs text-[#6B7280]">
                  Enter your details so the flight can be automatically booked on your scheduled date.
                </p>
              </div>

              {/* Booking context banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#FFFCF9] rounded-xl border border-[#F1E5DB] text-xs">
                <div className="flex items-center gap-2">
                  <Plane size={14} className="text-blue-600" />
                  <span className="text-[#6B7280]">Travel Date:</span>
                  <strong className="text-[#171717]">{travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarCheck size={14} className="text-airfair-orange" />
                  <span className="text-[#6B7280]">Auto-Book On:</span>
                  <strong className="text-[#171717]">{selectedDateTrend?.dateString || "—"}</strong>
                  <span className="text-emerald-600 font-bold">₹{selectedDateTrend?.fare?.toLocaleString("en-IN") || "—"}</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#FFFCF9] rounded-xl border border-[#F1E5DB]">
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Email (Ticket Delivery)</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-white"
                  />
                </div>
              </div>

              {/* Travelers */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#171717]">Traveler Details ({passengers.length})</h3>
                  <button
                    type="button"
                    onClick={handleAddPassenger}
                    className="px-3 py-1 text-xs font-bold text-airfair-orange bg-[#FFF1E6] rounded-lg hover:bg-orange-100"
                  >
                    + Add Passenger
                  </button>
                </div>

                {passengers.map((p, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border border-[#F1E5DB] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F1E5DB] pb-2">
                      <span className="text-xs font-bold text-[#171717]">Passenger {idx + 1} (Adult)</span>
                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePassenger(idx)}
                          className="text-[11px] text-red-500 font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Title</label>
                        <select
                          value={p.title}
                          onChange={(e) => handlePassengerChange(idx, "title", e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-[#FFFCF9]"
                        >
                          <option value="Mr">Mr</option>
                          <option value="Ms">Ms</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Dr">Dr</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">First & Middle Name</label>
                        <input
                          type="text"
                          value={p.first_name}
                          onChange={(e) => handlePassengerChange(idx, "first_name", e.target.value)}
                          placeholder="e.g. Rahul"
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-[#FFFCF9]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Last Name</label>
                        <input
                          type="text"
                          value={p.last_name}
                          onChange={(e) => handlePassengerChange(idx, "last_name", e.target.value)}
                          placeholder="e.g. Sharma"
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-[#FFFCF9]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Gender</label>
                        <select
                          value={p.gender}
                          onChange={(e) => handlePassengerChange(idx, "gender", e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-[#E5E7EB] bg-[#FFFCF9]"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#F1E5DB]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-bold text-xs sm:text-sm flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back to Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  for (const p of passengers) {
                    if (!p.first_name.trim() || !p.last_name.trim()) {
                      setErrorMessage("Please enter first and last names for all passengers.");
                      return;
                    }
                  }
                  setErrorMessage("");
                  setStep(5);
                }}
                className="px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-warm-sm"
              >
                <span>Continue: Select Seats & Add-Ons</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SEATS & ANCILLARY ADD-ONS */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#171717]">Step 5: Aircraft Seats & Ancillaries</h2>
                  <p className="text-xs text-[#6B7280]">
                    Select preferred seats and add luggage or meals for {passengers.length} traveler(s).
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
                    <span>Legroom (₹800)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-orange-100 border border-orange-400" />
                    <span>Win/Aisle (₹350)</span>
                  </div>
                </div>
              </div>

              {/* Cabin Layout */}
              <div className="max-w-md mx-auto p-5 bg-[#FFFCF9] border-2 border-dashed border-[#F1E5DB] rounded-2xl">
                <div className="text-center text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">
                  Cockpit / Front of Aircraft
                </div>

                <div className="space-y-2">
                  {SEAT_ROWS.map((row) => {
                    const isExtraLegroom = row === 1;
                    return (
                      <div key={row} className="flex items-center justify-center gap-1.5">
                        {SEAT_COLS.slice(0, 3).map((col) => {
                          const seatId = `${row}${col}`;
                          const isWindow = col === "A";
                          const isAisle = col === "C";
                          const seatType = isExtraLegroom ? "EXTRA_LEGROOM" : (isWindow ? "WINDOW" : (isAisle ? "AISLE" : "STANDARD"));
                          const price = isExtraLegroom ? 800 : (isWindow || isAisle ? 350 : 0);
                          const isSelected = !!selectedSeats[seatId];

                          return (
                            <button
                              key={seatId}
                              type="button"
                              onClick={() => toggleSeat(seatId, seatType, price)}
                              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-emerald-500 text-white shadow-warm-sm scale-105"
                                  : isExtraLegroom
                                  ? "bg-blue-50 border border-blue-300 text-blue-700"
                                  : isWindow || isAisle
                                  ? "bg-orange-50 border border-orange-200 text-orange-700"
                                  : "bg-white border border-[#E5E7EB] text-[#6B7280]"
                              }`}
                            >
                              {seatId}
                            </button>
                          );
                        })}

                        <div className="w-5 text-center text-[10px] font-bold text-[#9CA3AF]">{row}</div>

                        {SEAT_COLS.slice(3, 6).map((col) => {
                          const seatId = `${row}${col}`;
                          const isWindow = col === "F";
                          const isAisle = col === "D";
                          const seatType = isExtraLegroom ? "EXTRA_LEGROOM" : (isWindow ? "WINDOW" : (isAisle ? "AISLE" : "STANDARD"));
                          const price = isExtraLegroom ? 800 : (isWindow || isAisle ? 350 : 0);
                          const isSelected = !!selectedSeats[seatId];

                          return (
                            <button
                              key={seatId}
                              type="button"
                              onClick={() => toggleSeat(seatId, seatType, price)}
                              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-emerald-500 text-white shadow-warm-sm scale-105"
                                  : isExtraLegroom
                                  ? "bg-blue-50 border border-blue-300 text-blue-700"
                                  : isWindow || isAisle
                                  ? "bg-orange-50 border border-orange-200 text-orange-700"
                                  : "bg-white border border-[#E5E7EB] text-[#6B7280]"
                              }`}
                            >
                              {seatId}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ancillary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div
                  onClick={() => setSelectedAddOns({ ...selectedAddOns, baggage_10kg: !selectedAddOns.baggage_10kg })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedAddOns.baggage_10kg ? "border-airfair-orange ring-2 ring-[#FFE2D1]" : "border-[#F1E5DB]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#171717]">
                      <Luggage size={16} className="text-airfair-orange" />
                      <span>Prepaid 10kg Excess Baggage</span>
                    </div>
                    <span className="font-bold text-xs">₹900</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">Save up to 45% compared to airport check-in counter fees.</p>
                </div>

                <div
                  onClick={() => setSelectedAddOns({ ...selectedAddOns, meal_gourmet: !selectedAddOns.meal_gourmet })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedAddOns.meal_gourmet ? "border-airfair-orange ring-2 ring-[#FFE2D1]" : "border-[#F1E5DB]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#171717]">
                      <Coffee size={16} className="text-airfair-orange" />
                      <span>Gourmet Hot Meal & Beverage</span>
                    </div>
                    <span className="font-bold text-xs">₹450</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">Chef-curated North/South Indian hot meal with cold beverage.</p>
                </div>

                <div
                  onClick={() => setSelectedAddOns({ ...selectedAddOns, travel_insurance: !selectedAddOns.travel_insurance })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedAddOns.travel_insurance ? "border-airfair-orange ring-2 ring-[#FFE2D1]" : "border-[#F1E5DB]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#171717]">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>Comprehensive Travel Insurance</span>
                    </div>
                    <span className="font-bold text-xs">₹249</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">Covers medical emergencies up to ₹5,00,000, cancellations & baggage delay.</p>
                </div>

                <div
                  onClick={() => setSelectedAddOns({ ...selectedAddOns, priority_boarding: !selectedAddOns.priority_boarding })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedAddOns.priority_boarding ? "border-airfair-orange ring-2 ring-[#FFE2D1]" : "border-[#F1E5DB]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#171717]">
                      <Sparkles size={16} className="text-amber-500" />
                      <span>Priority Baggage & Fast-Track Boarding</span>
                    </div>
                    <span className="font-bold text-xs">₹350</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">Dedicated check-in queue and early cabin baggage priority.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#F1E5DB]">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-bold text-xs sm:text-sm flex items-center gap-1.5"
              >
                <ChevronLeft size={16} />
                <span>Back to Traveler Details</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeBooking}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-warm-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scheduling Auto-Booking & Locking Fare...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>Confirm Auto-Booking on Scheduled Date</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: AUTO-BOOKING CONFIRMATION & CALENDAR RECEIPT */}
        {step === 6 && createdBooking && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#F1E5DB] shadow-warm-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
                <Zap size={13} />
                <span>Auto-Booking Successfully Scheduled</span>
              </div>
              <h2 className="text-2xl font-black text-[#171717]">
                Ticket Purchase Scheduled for {selectedDateTrend?.dateString}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] max-w-lg mx-auto">
                AIRFAIR will automatically purchase the ticket for <strong>{customer.name}</strong> on <strong>{selectedDateTrend?.dateString}</strong> at the predicted best fare. Your flight departs on <strong>{travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong>.
              </p>
            </div>

            {/* Two-date highlight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-airfair-orange uppercase">
                  <CalendarCheck size={14} />
                  <span>Auto-Book Date (Purchase)</span>
                </div>
                <div className="text-lg font-black text-[#171717]">
                  {selectedDateTrend?.dayName}, {selectedDateTrend?.monthName} {selectedDateTrend?.dayNum}, 2026
                </div>
                <div className="text-xs text-[#6B7280]">
                  Ticket will be purchased on this date at <strong className="text-emerald-700">₹{selectedDateTrend?.fare?.toLocaleString("en-IN")}/adult</strong>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase">
                  <Plane size={14} />
                  <span>Travel Date (Departure)</span>
                </div>
                <div className="text-lg font-black text-[#171717]">
                  {travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}
                </div>
                <div className="text-xs text-[#6B7280]">
                  {selectedFlight?.airline_name} • {selectedOrigin} → {selectedDestination}
                </div>
              </div>
            </div>

            {/* Boarding Pass Style Card */}
            <div className="p-6 bg-[#FFFCF9] border-2 border-orange-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1E5DB] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-airfair-orange text-white flex items-center justify-center font-black text-xs">
                    {selectedFlight?.airline_code || "6E"}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#171717]">{selectedFlight?.airline_name}</div>
                    <div className="text-[11px] text-[#6B7280]">{selectedFlight?.flight_number || "Flight 6E-204"} • Economy</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#9CA3AF] uppercase">AIRFAIR Reference</div>
                  <div className="text-lg font-black text-airfair-orange">{createdBooking.booking_reference}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center py-2">
                <div>
                  <div className="text-2xl font-black text-[#171717]">{selectedOrigin}</div>
                  <div className="text-[11px] text-[#6B7280]">
                    {ALL_AIRPORTS.find(a => a.code === selectedOrigin)?.city}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <Plane size={18} className="text-airfair-orange" />
                  <div className="text-[10px] text-emerald-600 font-bold">Auto-Book Scheduled ✅</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#171717]">{selectedDestination}</div>
                  <div className="text-[11px] text-[#6B7280]">
                    {ALL_AIRPORTS.find(a => a.code === selectedDestination)?.city}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs border-t border-[#F1E5DB] pt-3 text-[#6B7280]">
                <div>
                  <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase">Auto-Book Date</span>
                  <span className="font-bold text-airfair-orange">{selectedDateTrend?.dateString}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase">Travel Date</span>
                  <span className="font-bold text-[#171717]">{travelDate}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase">Traveler(s)</span>
                  <span className="font-bold text-[#171717]">{passengers.length} Passenger(s)</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase">Locked Total Fare</span>
                  <span className="font-bold text-emerald-600">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#9CA3AF] uppercase">Booking Status</span>
                  <span className="font-bold text-blue-600">SCHEDULED_CONFIRMED</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/my-bookings"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm text-center shadow-warm-sm"
              >
                View in My Bookings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedSeats({});
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-bold text-xs sm:text-sm text-center hover:bg-[#FFFCF9]"
              >
                Schedule Another Flight
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
