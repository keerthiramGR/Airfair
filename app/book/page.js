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
  ArrowLeftRight,
  Smartphone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Wifi,
  BadgeCheck
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { API_BASE_URL } from "@/lib/api";

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

// Generate flexible price trend data from today up to travel date
function generateFlexiblePriceTrends(basePrice = 5500, airlineCode = "6E", travelDateStr = null) {
  const trends = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let numDays = 14;
  if (travelDateStr) {
    const travelD = new Date(travelDateStr + "T00:00:00");
    const diffTime = travelD.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    numDays = Math.max(1, Math.min(diffDays + 1, 45));
  }

  let lowestPrice = Infinity;
  let lowestIndex = -1;

  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isMidweek = d.getDay() === 2 || d.getDay() === 3;
    const isToday = i === 0;

    let factor = 1.0;
    if (isToday) {
      factor = 1.0; // standard immediate purchase fare
    } else if (i < 3) {
      factor = 1.12 + (3 - i) * 0.05;
    } else if (i >= 6 && i <= 18 && isMidweek) {
      factor = 0.84; // lowest sweet spot
    } else if (isWeekend) {
      factor = 1.10;
    } else {
      factor = 0.94 + ((i * 7) % 15) / 100;
    }

    const estimatedFare = Math.round((basePrice * factor) / 50) * 50;
    if (estimatedFare < lowestPrice) {
      lowestPrice = estimatedFare;
      lowestIndex = i;
    }

    const prevEst = i > 0 ? trends[i - 1].fare : estimatedFare;
    const diffPct = prevEst > 0 ? Math.round(((estimatedFare - prevEst) / prevEst) * 100) : 0;

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
      isToday,
      isLowest: false
    });
  }

  if (lowestIndex >= 0) {
    trends[lowestIndex].isLowest = true;
  }

  return trends;
}

const generate30DayPriceTrends = generateFlexiblePriceTrends;

export default function BookFlightPage() {
  // Stepper: 1: Route & Flight, 2: Travel Date, 3: Booking Calendar (auto-book date), 4: Passenger Info, 5: Seats & Addons, 6: Payment, 7: Confirmed
  const [step, setStep] = useState(1);
  const [quotes, setQuotes] = useState([]);
  const [selectedOrigin, setSelectedOrigin] = useState("DEL");
  const [selectedDestination, setSelectedDestination] = useState("BOM");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  // Travel Date State (user can book for any upcoming date: today, tomorrow, or future)
  const todayDateStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const minTravelDate = todayDateStr;

  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [travelDateError, setTravelDateError] = useState("");

  // Booking & Purchase Timing State
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

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("upi"); // 'upi' | 'card'
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });
  const [showCvv, setShowCvv] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const BANKS = [
    { id: "sbi", name: "State Bank of India", short: "SBI", gradient: "from-[#1a237e] to-[#283593]", accent: "#1565C0", logo: "🏦" },
    { id: "hdfc", name: "HDFC Bank", short: "HDFC", gradient: "from-[#004C8C] to-[#0277BD]", accent: "#0288D1", logo: "🏛️" },
    { id: "icici", name: "ICICI Bank", short: "ICICI", gradient: "from-[#b71c1c] to-[#c62828]", accent: "#D32F2F", logo: "💳" },
    { id: "axis", name: "Axis Bank", short: "AXIS", gradient: "from-[#7B1FA2] to-[#6A1B9A]", accent: "#8E24AA", logo: "🏢" },
    { id: "kotak", name: "Kotak Mahindra", short: "KOTAK", gradient: "from-[#E65100] to-[#BF360C]", accent: "#E64A19", logo: "🔴" },
    { id: "pnb", name: "Punjab National", short: "PNB", gradient: "from-[#1B5E20] to-[#2E7D32]", accent: "#388E3C", logo: "🟢" }
  ];

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleCardNumberChange = (e) => {
    setCardData({ ...cardData, number: formatCardNumber(e.target.value) });
  };

  const handleExpiryChange = (e) => {
    setCardData({ ...cardData, expiry: formatExpiry(e.target.value) });
  };

  const maskCardNumber = (num) => {
    const clean = num.replace(/\s/g, "");
    if (clean.length === 0) return "•••• •••• •••• ••••";
    const parts = [];
    for (let i = 0; i < 16; i += 4) {
      const chunk = clean.slice(i, i + 4);
      if (i < 8 && chunk.length === 4) parts.push("••••");
      else parts.push(chunk.padEnd(4, "•"));
    }
    return parts.join(" ");
  };

  const handlePayNow = async () => {
    if (paymentMethod === "upi") {
      if (!upiId.match(/^[\w.]+@[\w]+$/)) {
        setUpiError("Please enter a valid UPI ID (e.g. name@upi)");
        return;
      }
      setUpiError("");
    } else {
      const digits = cardData.number.replace(/\s/g, "");
      if (digits.length < 16) { setErrorMessage("Please enter a valid 16-digit card number."); return; }
      if (!cardData.name.trim()) { setErrorMessage("Please enter the cardholder name."); return; }
      if (cardData.expiry.length < 5) { setErrorMessage("Please enter a valid expiry date."); return; }
      if (cardData.cvv.length < 3) { setErrorMessage("Please enter a valid CVV."); return; }
      if (!selectedBank) { setErrorMessage("Please select your bank."); return; }
    }
    setErrorMessage("");
    setIsPaymentProcessing(true);
    // Simulate payment gateway delay
    await new Promise(r => setTimeout(r, 2200));
    setIsPaymentProcessing(false);
    setPaymentSuccess(true);
    // Proceed to finalize booking in backend
    await handleFinalizeBooking();
  };

  // Load Quotes from Backend
  useEffect(() => {
    async function load() {
      setIsLoadingQuotes(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/fares?limit=100`);
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
      const trends = generateFlexiblePriceTrends(flight.total_fare, flight.airline_code, travelDate);
      setPriceTrends(trends);
      // Select lowest fare day by default
      const lowestDay = trends.find(t => t.isLowest) || trends[0];
      setSelectedDateTrend(lowestDay);
    }
  }, [shortlistedFlights, selectedOrigin, selectedDestination]);

  // Recalculate price trends dynamically whenever travelDate changes
  useEffect(() => {
    if (selectedFlight && travelDate) {
      const trends = generateFlexiblePriceTrends(selectedFlight.total_fare, selectedFlight.airline_code, travelDate);
      setPriceTrends(trends);
      // If current selection is beyond new travel date, re-select
      if (!selectedDateTrend || (selectedDateTrend.dateString > travelDate)) {
        const lowestDay = trends.find(t => t.isLowest) || trends[0];
        setSelectedDateTrend(lowestDay);
      }
    }
  }, [travelDate, selectedFlight]);

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
    const trends = generateFlexiblePriceTrends(flight.total_fare, flight.airline_code, travelDate);
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
    try {
      // 1. Initiate booking in FastAPI with full flight, corridor & date details
      const initRes = await fetch(`${API_BASE_URL}/api/bookings/initiate`, {
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
          travel_date: travelDate || "2026-10-04",
          auto_book_execution_date: selectedDateTrend?.dateString || new Date().toISOString().split("T")[0],
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
      await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/passengers`, {
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
        await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/seats`, {
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
        await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/add-ons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ add_ons: addonsPayload })
        });
      }

      // 5. Checkout / Prepare Payment Intent
      const payRes = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const payData = await payRes.json();

      // 6. Verify & Issue / Schedule
      const verifyRes = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/verify-payment`, {
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
      setStep(7);
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
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
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
                {s < 7 && <div className={`w-2 sm:w-3 h-0.5 ${step > s ? "bg-emerald-400" : "bg-[#E5E7EB]"}`} />}
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

              {/* Flexible Travel Info Card */}
              <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-900">
                  <Plane size={16} className="text-airfair-orange" />
                  <span>Book Whenever You Want — Flexible Departure Dates</span>
                </div>
                <p className="text-xs text-orange-800 leading-relaxed">
                  Choose any departure date that suits your travel schedule — whether you're flying <strong>tomorrow</strong>, 
                  next week, or months ahead. On the next step, you can choose to <strong>book immediately today</strong> or 
                  let AIRFAIR's auto-scheduler buy on the <strong>cheapest predicted day</strong> before your flight!
                </p>
                <div className="flex items-center gap-4 pt-1 text-[11px] font-bold text-airfair-orange">
                  <span className="flex items-center gap-1"><Zap size={12} /> Instant or Auto-Scheduled</span>
                  <span className="flex items-center gap-1"><TrendingDown size={12} /> Optimal Fare Prediction</span>
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
                      setTravelDateError("Travel date cannot be in the past.");
                    } else {
                      setTravelDateError("");
                    }
                  }}
                  className="w-full sm:w-80 px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm font-bold bg-[#FFFCF9] text-[#171717] focus:ring-2 focus:ring-orange-200 outline-none"
                />
                <p className="text-[11px] text-[#9CA3AF]">
                  Select any date from today (<strong>{minTravelDate}</strong>) onwards.
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
                      Next step: choose to <strong>book instantly today</strong> or schedule auto-booking on the lowest fare day.
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
                <span>Continue: Choose Booking & Purchase Timing</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREDICTIVE PRICE CALENDAR & TIMING SELECTOR */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1E5DB] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-airfair-orange" />
                    <h2 className="text-base font-bold text-[#171717]">
                      Step 3: Choose Purchase Timing & Fare Forecast
                    </h2>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Fly on <strong>{travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong>. Book immediately today, or choose any date before departure for scheduled auto-booking.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-[11px] text-[#6B7280]">Best Fare</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-[11px] text-[#6B7280]">Low / Decreasing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-rose-400" />
                    <span className="text-[11px] text-[#6B7280]">Peak Fare</span>
                  </div>
                </div>
              </div>

              {/* Purchase Timing Quick Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Book Immediately Today */}
                <div
                  onClick={() => {
                    const todayItem = priceTrends.find(t => t.isToday) || priceTrends[0];
                    if (todayItem) setSelectedDateTrend(todayItem);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    selectedDateTrend?.isToday || selectedDateTrend?.dateString === todayDateStr
                      ? "bg-orange-50/60 border-airfair-orange shadow-warm-xs"
                      : "bg-[#FFFCF9] border-[#F1E5DB] hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 text-airfair-orange flex items-center justify-center font-bold">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                        <span>Book Immediately (Today)</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Instant</span>
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        Ticket issued today upon payment verification
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#171717]">
                      ₹{(priceTrends[0]?.fare || selectedFlight?.total_fare || 5450).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-[#9CA3AF]">today's rate</div>
                  </div>
                </div>

                {/* Option 2: Smart Auto-Book on Lowest Fare Day */}
                <div
                  onClick={() => {
                    const lowestItem = priceTrends.find(t => t.isLowest) || priceTrends[0];
                    if (lowestItem) setSelectedDateTrend(lowestItem);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    selectedDateTrend?.isLowest && !selectedDateTrend?.isToday
                      ? "bg-emerald-50/60 border-emerald-500 shadow-warm-xs"
                      : "bg-[#FFFCF9] border-[#F1E5DB] hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      <Flame size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                        <span>Smart Auto-Book (Best Fare Day)</span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-100 text-airfair-orange text-[10px] font-bold">AI Optimal</span>
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        Auto-executes on statistically cheapest day
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-700">
                      ₹{(priceTrends.find(t => t.isLowest)?.fare || selectedFlight?.total_fare || 4800).toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-bold">lowest fare</div>
                  </div>
                </div>
              </div>

              {/* Booking Calendar Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#6B7280] uppercase flex items-center gap-1">
                  <Calendar size={13} className="text-airfair-orange" />
                  <span>Or pick any specific purchase date from the calendar below:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
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
                          <span>{t.isToday ? "Today" : t.dayName}</span>
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
                            {t.isToday ? (
                              <span className="text-orange-600 bg-orange-100/80 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                <Zap size={10} /> Instant
                              </span>
                            ) : isLowest ? (
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

                        {/* Status Indicator */}
                        <div className="mt-1 pt-1 border-t border-[#F1E5DB]/60">
                          {isSelected ? (
                            <span className="text-[10px] font-black text-airfair-orange flex items-center justify-center gap-1">
                              <CheckCircle2 size={11} /> {t.isToday ? "Book Today ✅" : "Auto-Book ✅"}
                            </span>
                          ) : (
                            <span className="text-[9px] text-[#9CA3AF]">
                              {t.isToday ? "Book Today" : "Click to Pick"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Date Summary Banner — dynamic for Instant vs Scheduled */}
              {selectedDateTrend && (
                <div className="p-4 bg-[#FFFCF9] border-2 border-orange-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-airfair-orange text-white flex items-center justify-center">
                        {selectedDateTrend.isToday || selectedDateTrend.dateString === todayDateStr ? (
                          <Zap size={22} />
                        ) : (
                          <CalendarCheck size={22} />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-airfair-orange uppercase">
                          {selectedDateTrend.isToday || selectedDateTrend.dateString === todayDateStr
                            ? "Instant Booking Selected (Purchase Today)"
                            : "Scheduled Auto-Book Date (Purchase Day)"}
                        </div>
                        <div className="text-base font-black text-[#171717]">
                          {selectedDateTrend.dayName}, {selectedDateTrend.monthName} {selectedDateTrend.dayNum}, 2026 ({selectedDateTrend.dateString})
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          Fare: <strong className="text-emerald-700">₹{selectedDateTrend.fare.toLocaleString("en-IN")} per adult</strong> • {
                            selectedDateTrend.isToday
                              ? "Will be booked immediately upon payment"
                              : selectedDateTrend.isLowest
                              ? "Lowest fare detected before your departure!"
                              : "Selected for scheduled auto-purchase"
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                        selectedDateTrend.isToday || selectedDateTrend.dateString === todayDateStr
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {selectedDateTrend.isToday || selectedDateTrend.dateString === todayDateStr ? (
                          <>
                            <Zap size={14} />
                            <span>Instant Booking</span>
                          </>
                        ) : (
                          <>
                            <CalendarCheck size={14} />
                            <span>Auto-Book Scheduled</span>
                          </>
                        )}
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
                    {selectedDateTrend.isToday || selectedDateTrend.dateString === todayDateStr ? (
                      <>AIRFAIR will book your <strong>{selectedOrigin} → {selectedDestination}</strong> ticket immediately today upon payment completion.</>
                    ) : (
                      <>AIRFAIR will automatically purchase your <strong>{selectedOrigin} → {selectedDestination}</strong> ticket on <strong>{selectedDateTrend.dateString}</strong> at the predicted fare of ₹{selectedDateTrend.fare.toLocaleString("en-IN")}. Your flight departs on <strong>{travelDate}</strong>.</>
                    )}
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
                onClick={() => { setErrorMessage(""); setStep(6); }}
                className="px-6 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-warm-sm"
              >
                <CreditCard size={16} />
                <span>Continue to Payment</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: PAYMENT */}
        {step === 6 && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white p-5 rounded-2xl border border-[#F1E5DB] shadow-warm-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-[#171717] flex items-center gap-2">
                  <CreditCard size={18} className="text-airfair-orange" />
                  Step 6: Complete Payment
                </h2>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Lock size={11} /> Secure Payment
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#FFF8F2] to-[#FFF1E6] rounded-xl border border-orange-200">
                <div className="text-xs text-[#6B7280]">
                  <div className="font-bold text-[#171717] text-sm mb-0.5">{selectedFlight?.airline_name} • {selectedOrigin} → {selectedDestination}</div>
                  <div>{passengers.length} Passenger(s) • {selectedDateTrend?.dateString}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#9CA3AF] uppercase font-bold">Amount Due</div>
                  <div className="text-2xl font-black text-airfair-orange">₹{grandTotal.toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white p-6 rounded-2xl border border-[#F1E5DB] shadow-warm-xs space-y-5">
              <div className="flex gap-3">
                <button
                  onClick={() => { setPaymentMethod("upi"); setErrorMessage(""); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                    paymentMethod === "upi"
                      ? "border-airfair-orange bg-[#FFF8F2] text-airfair-orange shadow-warm-sm"
                      : "border-[#E5E7EB] text-[#6B7280] hover:border-orange-200"
                  }`}
                >
                  <Smartphone size={18} />
                  UPI
                </button>
                <button
                  onClick={() => { setPaymentMethod("card"); setErrorMessage(""); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                    paymentMethod === "card"
                      ? "border-airfair-orange bg-[#FFF8F2] text-airfair-orange shadow-warm-sm"
                      : "border-[#E5E7EB] text-[#6B7280] hover:border-orange-200"
                  }`}
                >
                  <CreditCard size={18} />
                  Bank Card
                </button>
              </div>

              {/* ─── UPI PANEL ─── */}
              {paymentMethod === "upi" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f0f4ff] to-[#e8ecff] border border-indigo-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                        <span className="text-2xl">₹</span>
                      </div>
                      <div>
                        <div className="font-black text-[#171717] text-base">Pay via UPI</div>
                        <div className="text-xs text-[#6B7280]">Instant payment via any UPI app</div>
                      </div>
                    </div>

                    {/* UPI App logos */}
                    <div className="flex items-center gap-3">
                      {[
                        { name: "GPay", emoji: "🟢", label: "Google Pay" },
                        { name: "PhonePe", emoji: "🟣", label: "PhonePe" },
                        { name: "Paytm", emoji: "🔵", label: "Paytm" },
                        { name: "BHIM", emoji: "🟠", label: "BHIM UPI" },
                      ].map(app => (
                        <div key={app.name} className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg">{app.emoji}</div>
                          <span className="text-[9px] font-bold text-[#6B7280]">{app.name}</span>
                        </div>
                      ))}
                      <div className="ml-auto text-xs text-[#9CA3AF]">& more</div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-[#6B7280] uppercase">Your UPI ID</label>
                      <div className="relative">
                        <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          type="text"
                          placeholder="yourname@upi  or  number@bank"
                          value={upiId}
                          onChange={e => { setUpiId(e.target.value); setUpiError(""); }}
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-indigo-200 bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-300 outline-none"
                        />
                      </div>
                      {upiError && <div className="text-xs text-red-600 font-semibold flex items-center gap-1"><AlertCircle size={12} />{upiError}</div>}
                      <p className="text-[11px] text-[#9CA3AF]">e.g. rahul@okicici · 9876543210@ybl</p>
                    </div>
                  </div>

                  {/* Pay button */}
                  {!paymentSuccess ? (
                    <button
                      onClick={handlePayNow}
                      disabled={isPaymentProcessing || isProcessing}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-base flex items-center justify-center gap-3 shadow-lg disabled:opacity-60 transition-all"
                    >
                      {isPaymentProcessing ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processing Payment…</span></>
                      ) : isProcessing ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Confirming Booking…</span></>
                      ) : (
                        <><Smartphone size={20} /><span>Pay ₹{grandTotal.toLocaleString("en-IN")} via UPI</span></>
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black text-base flex items-center justify-center gap-3">
                      <BadgeCheck size={22} /> Payment Successful! Confirming booking…
                    </div>
                  )}
                </div>
              )}

              {/* ─── BANK CARD PANEL ─── */}
              {paymentMethod === "card" && (
                <div className="space-y-5">
                  {/* Bank Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-2">Select Your Bank</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {BANKS.map(bank => (
                        <button
                          key={bank.id}
                          onClick={() => setSelectedBank(bank)}
                          className={`py-2 px-1 rounded-xl border-2 text-center transition-all ${
                            selectedBank?.id === bank.id
                              ? "border-airfair-orange bg-[#FFF8F2] shadow-warm-sm scale-105"
                              : "border-[#E5E7EB] hover:border-orange-200 bg-white"
                          }`}
                        >
                          <div className="text-lg mb-0.5">{bank.logo}</div>
                          <div className="text-[9px] font-black text-[#171717]">{bank.short}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animated Bank Card */}
                  <div
                    className="relative mx-auto"
                    style={{ width: 340, height: 200, perspective: "1000px" }}
                    onMouseEnter={() => setCardFlipped(false)}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        transformStyle: "preserve-3d",
                        transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                        transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                      }}
                    >
                      {/* Front */}
                      <div
                        style={{ backfaceVisibility: "hidden" }}
                        className={`absolute inset-0 rounded-2xl p-6 bg-gradient-to-br ${
                          selectedBank ? selectedBank.gradient : "from-[#374151] to-[#1F2937]"
                        } shadow-2xl flex flex-col justify-between overflow-hidden`}
                      >
                        {/* Card shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-white/20 pointer-events-none" />
                        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5" />

                        {/* Top Row */}
                        <div className="relative flex items-start justify-between">
                          <div>
                            <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                              {selectedBank ? selectedBank.name : "Select Bank"}
                            </div>
                            <div className="text-white font-black text-sm mt-0.5">Debit Card</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Wifi size={18} className="text-white/70 rotate-90" />
                          </div>
                        </div>

                        {/* Chip & Number */}
                        <div className="relative space-y-3">
                          <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center">
                            <div className="w-7 h-5 rounded border border-yellow-600/40 grid grid-cols-2 gap-px p-0.5">
                              <div className="bg-yellow-400/60 rounded-sm"/>
                              <div className="bg-yellow-400/60 rounded-sm"/>
                              <div className="bg-yellow-400/60 rounded-sm"/>
                              <div className="bg-yellow-400/60 rounded-sm"/>
                            </div>
                          </div>
                          <div className="text-white font-mono font-bold text-lg tracking-[0.2em]">
                            {maskCardNumber(cardData.number)}
                          </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="relative flex items-end justify-between">
                          <div>
                            <div className="text-white/50 text-[9px] uppercase tracking-wider">Card Holder</div>
                            <div className="text-white font-bold text-sm tracking-wide">
                              {cardData.name || "YOUR NAME"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white/50 text-[9px] uppercase tracking-wider">Expires</div>
                            <div className="text-white font-bold text-sm">{cardData.expiry || "MM/YY"}</div>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-8 h-8 rounded-full bg-red-500/80 -mr-3" />
                            <div className="w-8 h-8 rounded-full bg-yellow-400/80" />
                          </div>
                        </div>
                      </div>

                      {/* Back */}
                      <div
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                          selectedBank ? selectedBank.gradient : "from-[#374151] to-[#1F2937]"
                        } shadow-2xl flex flex-col justify-center overflow-hidden`}
                      >
                        <div className="w-full h-10 bg-black/60 mt-6 mb-4" />
                        <div className="px-6 flex items-center gap-3">
                          <div className="flex-1 h-8 bg-white/90 rounded flex items-center px-3">
                            <div className="flex-1 h-1 bg-[#999]/40 rounded" />
                          </div>
                          <div className="w-12 h-8 bg-white/90 rounded flex items-center justify-center">
                            <span className="text-sm font-black text-[#171717]">{cardData.cvv || "CVV"}</span>
                          </div>
                        </div>
                        <div className="px-6 mt-2 text-white/50 text-[9px]">CVV / CVC is the 3-digit code on the back of your card</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* Card Number */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">Card Number</label>
                      <div className="relative">
                        <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardData.number}
                          onChange={handleCardNumberChange}
                          inputMode="numeric"
                          maxLength={19}
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#FFFCF9] text-sm font-mono font-bold tracking-widest focus:ring-2 focus:ring-orange-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">Cardholder Name</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          type="text"
                          placeholder="Name as on card"
                          value={cardData.name}
                          onChange={e => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#FFFCF9] text-sm font-bold tracking-wide focus:ring-2 focus:ring-orange-200 outline-none uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Expiry */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">Expiry Date</label>
                        <div className="relative">
                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardData.expiry}
                            onChange={handleExpiryChange}
                            inputMode="numeric"
                            maxLength={5}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#FFFCF9] text-sm font-bold focus:ring-2 focus:ring-orange-200 outline-none"
                          />
                        </div>
                      </div>

                      {/* CVV */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#6B7280] uppercase mb-1">CVV</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                          <input
                            type={showCvv ? "text" : "password"}
                            placeholder="•••"
                            value={cardData.cvv}
                            onFocus={() => setCardFlipped(true)}
                            onBlur={() => setCardFlipped(false)}
                            onChange={e => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                            inputMode="numeric"
                            maxLength={4}
                            className="w-full pl-9 pr-9 py-3 rounded-xl border border-[#E5E7EB] bg-[#FFFCF9] text-sm font-bold focus:ring-2 focus:ring-orange-200 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCvv(!showCvv)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                          >
                            {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security badges */}
                  <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] pt-1">
                    <div className="flex items-center gap-1"><Lock size={11} className="text-emerald-500" /> 256-bit SSL</div>
                    <div className="flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-500" /> 3D Secure</div>
                    <div className="flex items-center gap-1"><BadgeCheck size={11} className="text-emerald-500" /> PCI DSS Compliant</div>
                  </div>

                  {/* Pay button */}
                  {!paymentSuccess ? (
                    <button
                      onClick={handlePayNow}
                      disabled={isPaymentProcessing || isProcessing}
                      className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-lg disabled:opacity-60 transition-all text-white bg-gradient-to-r ${
                        selectedBank ? selectedBank.gradient : "from-[#374151] to-[#1F2937]"
                      } hover:brightness-110`}
                    >
                      {isPaymentProcessing ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processing Payment…</span></>
                      ) : isProcessing ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Confirming Booking…</span></>
                      ) : (
                        <><CreditCard size={20} /><span>Pay ₹{grandTotal.toLocaleString("en-IN")} Securely</span><Lock size={16} /></>
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black text-base flex items-center justify-center gap-3">
                      <BadgeCheck size={22} /> Payment Successful! Confirming booking…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom nav */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#F1E5DB]">
              <button
                type="button"
                onClick={() => setStep(5)}
                disabled={isPaymentProcessing || isProcessing || paymentSuccess}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-bold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                <span>Back to Seats & Add-Ons</span>
              </button>
              <div className="text-xs text-[#9CA3AF] flex items-center gap-1">
                <Lock size={11} /> Your payment is 100% secure
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: AUTO-BOOKING CONFIRMATION & CALENDAR RECEIPT */}
        {step === 7 && createdBooking && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#F1E5DB] shadow-warm-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={32} />
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr
                  ? "bg-blue-50 text-blue-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}>
                <Zap size={13} />
                <span>
                  {selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr
                    ? "Instant Booking Confirmed"
                    : "Auto-Booking Successfully Scheduled"}
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#171717]">
                {selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr
                  ? `Booking Confirmed for ${travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}`
                  : `Ticket Purchase Scheduled for ${selectedDateTrend?.dateString}`}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] max-w-lg mx-auto">
                {selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr ? (
                  <>AIRFAIR has processed your ticket for <strong>{customer.name}</strong>. Your flight departs on <strong>{travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong>.</>
                ) : (
                  <>AIRFAIR will automatically purchase the ticket for <strong>{customer.name}</strong> on <strong>{selectedDateTrend?.dateString}</strong> at the predicted best fare. Your flight departs on <strong>{travelDate ? new Date(travelDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong>.</>
                )}
              </p>
            </div>

            {/* Two-date highlight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-airfair-orange uppercase">
                  <CalendarCheck size={14} />
                  <span>
                    {selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr
                      ? "Purchase Date (Immediate)"
                      : "Auto-Book Date (Purchase)"}
                  </span>
                </div>
                <div className="text-lg font-black text-[#171717]">
                  {selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr
                    ? "Today (Immediate Purchase)"
                    : `${selectedDateTrend?.dayName}, ${selectedDateTrend?.monthName} ${selectedDateTrend?.dayNum}, 2026`}
                </div>
                <div className="text-xs text-[#6B7280]">
                  {selectedDateTrend?.isToday || selectedDateTrend?.dateString <= todayDateStr
                    ? <>Ticket booked at <strong className="text-emerald-700">₹{selectedDateTrend?.fare?.toLocaleString("en-IN")}/adult</strong></>
                    : <>Ticket will be purchased on this date at <strong className="text-emerald-700">₹{selectedDateTrend?.fare?.toLocaleString("en-IN")}/adult</strong></>}
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
